/**
 * Browser-Native GitHub CMS Publisher
 * Uses the user's browser-local Fine-grained PAT (never committed to git)
 * to directly commit updates to `src/data/siteConfig.js` via GitHub REST API,
 * triggering GitHub Actions auto-deploy to blog.gavinli.top in ~30 seconds.
 */

import { getAdminConfig } from './analytics.js';

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
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
    links: siteConfig.links || [],
    nowList: siteConfig.nowList || []
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

export async function publishSiteConfigToGitHub(siteConfig, microNotes, commitMessage) {
  const cfg = getAdminConfig();
  if (!cfg.githubToken) {
    throw new Error('请先在「后台配置」中填写 GitHub Personal Access Token');
  }

  const filePath = 'src/data/siteConfig.js';
  const apiBase = `https://api.github.com/repos/${cfg.githubOwner}/${cfg.githubRepo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${cfg.githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };

  // 1. Fetch current file SHA so GitHub accepts the update cleanly
  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(cfg.githubBranch)}`, { headers });
  if (!getRes.ok) {
    const errBody = await getRes.json().catch(() => ({}));
    throw new Error(`读取仓库文件失败 (${getRes.status}): ${errBody.message || '请检查 Token 权限'}`);
  }
  const existing = await getRes.json();

  // 2. Commit updated siteConfig.js
  const newSource = generateSiteConfigSource(siteConfig, microNotes);
  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: commitMessage || 'chore(admin): update siteConfig and micro-notes',
      content: utf8ToBase64(newSource),
      sha: existing.sha,
      branch: cfg.githubBranch
    })
  });

  const putData = await putRes.json().catch(() => ({}));
  if (!putRes.ok) {
    throw new Error(`推送失败 (${putRes.status}): ${putData.message || '请确认 Token 有 Contents: Read and write 权限'}`);
  }

  return {
    sha: putData.commit?.sha?.slice(0, 7) || 'updated',
    url: putData.commit?.html_url || `https://github.com/${cfg.githubOwner}/${cfg.githubRepo}`
  };
}
