/**
 * Browser-Native GitHub CMS & DevOps Publisher
 * Uses the user's browser-local Fine-grained PAT (never committed to git)
 * to commit updates to `src/data/siteConfig.js`, `src/data/articles.json`,
 * upload compressed post images to `public/assets/posts/`, and monitor GitHub Actions.
 */

import { getAdminConfig, recordAuditLog } from './analytics.js';

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function generateSiteConfigSource(siteConfig, microNotes) {
  const cleanConfig = {
    brandName: siteConfig.brandName,
    owner: siteConfig.owner,
    bio: siteConfig.bio,
    coords: siteConfig.coords,
    established: siteConfig.established,
    analyticsEndpoint: siteConfig.analyticsEndpoint || '',
    announcement: {
      enabled: Boolean(siteConfig.announcement?.enabled),
      text: String(siteConfig.announcement?.text || ''),
      href: String(siteConfig.announcement?.href || ''),
      linkLabel: String(siteConfig.announcement?.linkLabel || ''),
      tone: siteConfig.announcement?.tone || 'tech'
    },
    links: Array.isArray(siteConfig.links) ? siteConfig.links : [],
    friendLinks: Array.isArray(siteConfig.friendLinks) ? siteConfig.friendLinks : [],
    nowList: Array.isArray(siteConfig.nowList) ? siteConfig.nowList : [],
    postOverrides: siteConfig.postOverrides && typeof siteConfig.postOverrides === 'object' ? siteConfig.postOverrides : {}
  };

  return `/**
 * 个人博客站点配置
 * 可在 #/admin 管理员后台直接编辑并一键推送至 GitHub 自动部署。
 */

export const SITE_CONFIG = ${JSON.stringify(cleanConfig, null, 2)};

/**
 * 碎碎念 / 庄园短记时间轴
 */
export const MICRO_NOTES = ${JSON.stringify(microNotes, null, 2)};
`;
}

export async function commitFileToGitHub(filePath, content, commitMessage, { isBase64 = false } = {}) {
  const cfg = getAdminConfig();
  if (!cfg.githubToken) {
    throw new Error('请先在「06 系统配置」中填写 GitHub Personal Access Token');
  }

  const apiBase = `https://api.github.com/repos/${cfg.githubOwner}/${cfg.githubRepo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${cfg.githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  let existingSha = undefined;
  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(cfg.githubBranch)}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    existingSha = existing.sha;
  } else if (getRes.status !== 404) {
    const errBody = await getRes.json().catch(() => ({}));
    throw new Error(`读取仓库文件失败 (${getRes.status}): ${errBody.message || '请检查 Token 权限'}`);
  }

  const payload = {
    message: commitMessage || `chore(admin): update ${filePath}`,
    content: isBase64 ? content : utf8ToBase64(content),
    branch: cfg.githubBranch
  };
  if (existingSha) payload.sha = existingSha;

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  const putData = await putRes.json().catch(() => ({}));
  if (!putRes.ok) {
    throw new Error(
      `推送失败 (${putRes.status}): ${putData.message || '请确认 Token 有 Contents: Read and write 权限'}`
    );
  }

  return {
    sha: putData.commit?.sha?.slice(0, 7) || 'updated',
    url: putData.commit?.html_url || `https://github.com/${cfg.githubOwner}/${cfg.githubRepo}`
  };
}

export async function publishSiteConfigToGitHub(siteConfig, microNotes, commitMessage) {
  const source = generateSiteConfigSource(siteConfig, microNotes);
  const res = await commitFileToGitHub(
    'src/data/siteConfig.js',
    source,
    commitMessage || 'content(admin): update siteConfig and micro-notes'
  );
  recordAuditLog('推送站点配置', `commit ${res.sha} (${commitMessage || 'siteConfig.js'})`).catch(() => {});
  return res;
}

export async function publishArticlesToGitHub(articlesArray, commitMessage) {
  const source = `${JSON.stringify(articlesArray, null, 2)}\n`;
  const res = await commitFileToGitHub(
    'src/data/articles.json',
    source,
    commitMessage || 'content(admin): update markdown articles'
  );
  recordAuditLog('发布/更新文章', `commit ${res.sha} (${articlesArray.length} 篇 MD 文章)`).catch(() => {});
  return res;
}

/**
 * Compress image in browser Canvas (max 1600px, WebP/JPEG 0.84) and upload to public/assets/posts/
 */
export async function compressImageFile(file, maxWidth = 1600, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('无法解析该图片格式'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        let ext = 'webp';
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          ext = 'jpg';
        }
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, ext, width: w, height: h, approxKb: Math.round((base64.length * 3) / 4 / 1024) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadPostImageToGitHub(file, slug = 'post') {
  const compressed = await compressImageFile(file);
  const safeSlug = String(slug || 'post')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'post';
  const stamp = Date.now().toString(36);
  const filename = `${safeSlug}-${stamp}.${compressed.ext}`;
  const repoPath = `public/assets/posts/${filename}`;

  const res = await commitFileToGitHub(
    repoPath,
    compressed.base64,
    `assets(admin): upload image ${filename}`,
    { isBase64: true }
  );

  recordAuditLog('上传文章图片', `${filename} (${compressed.approxKb} KB)`).catch(() => {});

  return {
    ...res,
    filename,
    publicUrl: `./assets/posts/${filename}`,
    width: compressed.width,
    height: compressed.height,
    approxKb: compressed.approxKb
  };
}

/**
 * Fetch latest GitHub Actions workflow runs for deployment monitoring
 */
export async function fetchGitHubWorkflowRuns(limit = 6) {
  const cfg = getAdminConfig();
  const url = `https://api.github.com/repos/${cfg.githubOwner}/${cfg.githubRepo}/actions/runs?per_page=${limit}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (cfg.githubToken) headers.Authorization = `Bearer ${cfg.githubToken}`;

  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `GitHub API HTTP ${res.status}`);
  }
  return (data.workflow_runs || []).map((r) => ({
    id: r.id,
    name: r.name || 'Deploy',
    status: r.status, // queued | in_progress | completed
    conclusion: r.conclusion, // success | failure | cancelled | null
    branch: r.head_branch,
    sha: (r.head_sha || '').slice(0, 7),
    message: r.head_commit?.message?.split('\n')[0] || r.display_title || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    url: r.html_url
  }));
}
