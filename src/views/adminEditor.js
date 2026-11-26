/**
 * Tab 02: Article Manager & Forum-Style Visual Markdown Studio
 * - Unified Markdown CMS: EVERY article (including existing published ones) is editable online
 * - Real-time URL Slug auto-generation from title (with manual override anytime)
 * - Forum-like formatting toolbar, shortcuts (Ctrl+B/I/K, Tab), split/edit/preview modes
 * - Drag & drop or Ctrl+V screenshot auto-compression & GitHub upload with instant local preview
 */

import { CATEGORIES } from '../data/posts.js';
import {
  escapeHtml,
  parseMarkdown,
  estimateWordCount,
  estimateReadTime
} from '../engine/markdown.js';
import {
  publishArticlesToGitHub,
  uploadPostImageToGitHub
} from '../engine/githubCms.js';
import { getAdminConfig } from '../engine/analytics.js';

const LOCAL_DRAFT_KEY = 'gavins_blog_md_editor_draft_v1';
const uploadedPreviewMap = new Map(); // ./assets/posts/xxx -> objectURL for immediate preview

function formatDuration(sec = 0) {
  if (!sec || sec < 1) return '--';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function stableShortHash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * Smart real-time slug generator:
 * - Extracts clean English/numeric keywords when present (e.g. "用 Google Cloud 搭建 VPS" -> "google-cloud-vps")
 * - Falls back to clean deterministic date + short hash for pure Chinese titles (e.g. "post-20261127-k8p2x")
 */
function slugifyTitle(title = '', dateStr = '') {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return '';

  const asciiSlug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44);

  if (asciiSlug && asciiSlug.length >= 2) {
    return asciiSlug;
  }

  const compactDate = String(dateStr || '').replace(/[^0-9]/g, '').slice(0, 8) ||
    new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `post-${compactDate}-${stableShortHash(cleanTitle)}`;
}

function todayDotDate(atmosphere) {
  return atmosphere.getSnapshot().dateStr.replace(/-/g, '.');
}

function wrapSelection(textarea, prefix, suffix = '', placeholder = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.slice(start, end) || placeholder;
  const replacement = `${prefix}${selected}${suffix}`;
  textarea.setRangeText(replacement, start, end, 'select');
  textarea.focus();
  const newStart = start + prefix.length;
  textarea.setSelectionRange(newStart, newStart + selected.length);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertBlock(textarea, snippet) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const needLead = before.length && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const text = `${needLead}${snippet}\n`;
  textarea.setRangeText(text, start, end, 'end');
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export function renderArticlesManagerTab(
  bodyEl,
  { atmosphere, draftArticles, latestStats, onNeedSettings, onStateChanged }
) {
  let editingArticle = null; // null = list view, object = editor view
  let editingIsNew = false;
  let editingOriginalSlug = '';
  let slugAutoSync = false; // auto-sync slug while typing title unless user manually edited slug
  let editorMode = 'split'; // split | edit | preview
  let dirtyArticles = false;

  const render = () => {
    if (editingArticle) {
      renderVisualEditor();
    } else {
      renderListView();
    }
  };

  /* ------------------------------------------------------------------------
     SUB-VIEW A: UNIFIED ARTICLE DIRECTORY & LIVE TELEMETRY MATRIX
     ------------------------------------------------------------------------ */
  function renderListView() {
    const stats = latestStats || {};
    const pages = stats.pages || {};
    const engagement = stats.engagement || {};
    const likes = stats.likes || {};
    const hasGithub = Boolean(getAdminConfig().githubToken);

    const rows = draftArticles
      .map((a) => ({
        ...a,
        status: a.status || 'published',
        pinned: Boolean(a.pinned),
        wordCount: estimateWordCount(a.markdown || ''),
        readTime: a.readTime || estimateReadTime(a.markdown || '')
      }))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.date || '').localeCompare(String(a.date || ''));
      });

    const statusBadge = (s) => {
      if (s === 'draft') return '<span class="swiss-tag">草稿</span>';
      if (s === 'hidden') return '<span class="swiss-tag swiss-tag-accent">已隐藏</span>';
      return '<span class="swiss-tag swiss-tag-tech">已发布</span>';
    };

    bodyEl.innerHTML = `
      <section class="liquid-glass liquid-glass-elevated admin-panel">
        <div class="admin-panel-head">
          <div>
            <span class="swiss-kicker">ARTICLES // 全站文章管理与阅读表现</span>
            <h2 class="panel-title" style="margin-top: 6px;">全部文章（${rows.length} 篇 · 均支持可视化编辑）</h2>
          </div>
          <div class="admin-btn-row">
            <button type="button" class="featured-cta" id="btn-new-article" style="border: none; cursor: pointer; padding: 9px 18px;">+ 撰写新文章</button>
            ${
              dirtyArticles
                ? `<button type="button" class="status-action-btn is-tech-active" id="btn-push-articles-list">
                    ${hasGithub ? '↑ 推送更改上线' : '配置 Token 以推送'}
                  </button>`
                : ''
            }
          </div>
        </div>

        <div id="articles-list-feedback" style="margin-top: 12px;"></div>

        ${
          localStorage.getItem(LOCAL_DRAFT_KEY)
            ? `<div class="swiss-callout is-tech" style="margin: 14px 0; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span>检测到浏览器本地有一份未推送的文章草稿缓存。</span>
                <div class="admin-btn-row">
                  <button type="button" class="status-action-btn is-tech-active" id="btn-restore-local-draft">继续编辑草稿</button>
                  <button type="button" class="status-action-btn" id="btn-discard-local-draft">丢弃缓存</button>
                </div>
              </div>`
            : ''
        }

        <div class="tier-table-wrap" style="margin-top: 16px;">
          <table class="swiss-table admin-articles-table">
            <thead>
              <tr>
                <th>状态</th>
                <th>文章标题 / 分类</th>
                <th>字数</th>
                <th>阅读量 (PV)</th>
                <th>平均停留 / 完读率</th>
                <th>点赞</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map((p) => {
                        const pathKey = `/post/${p.slug}`;
                        const pv = pages[pathKey] || 0;
                        const eng = engagement[pathKey];
                        const avgDwell = eng && eng.sessions ? formatDuration(eng.totalDwellSec / eng.sessions) : '--';
                        const compRate = eng && eng.sessions ? `${Math.round((eng.completed / eng.sessions) * 100)}%` : '--';
                        const likeCount = likes[p.slug] || 0;

                        return `
                          <tr>
                            <td style="white-space: nowrap;">
                              ${statusBadge(p.status)}
                              ${p.pinned ? '<span class="swiss-tag swiss-tag-accent" style="margin-left: 4px;">置顶</span>' : ''}
                            </td>
                            <td>
                              <div style="font-weight: 700; color: var(--ink-strong);">${escapeHtml(p.title)}</div>
                              <div class="swiss-mono" style="font-size: 11px; color: var(--ink-mute); margin-top: 3px;">
                                ${escapeHtml(p.category)} · ${escapeHtml(p.date)} · /post/${escapeHtml(p.slug)}
                              </div>
                            </td>
                            <td class="swiss-mono" style="white-space: nowrap;">${p.wordCount || '--'} 字</td>
                            <td class="swiss-mono" style="font-weight: 700;">${pv}</td>
                            <td class="swiss-mono" style="white-space: nowrap; font-size: 12px;">${avgDwell} / ${compRate}</td>
                            <td class="swiss-mono">♥ ${likeCount}</td>
                            <td style="white-space: nowrap;">
                              <div class="admin-btn-row" style="gap: 6px;">
                                <button type="button" class="status-action-btn is-tech-active" data-edit-slug="${escapeHtml(p.slug)}">编辑</button>
                                <a class="status-action-btn" style="text-decoration: none;" href="#/post/${escapeHtml(p.slug)}">预览</a>
                                <button type="button" class="status-action-btn" data-pin-slug="${escapeHtml(p.slug)}">${p.pinned ? '取消置顶' : '置顶'}</button>
                                <button type="button" class="status-action-btn" data-toggle-vis="${escapeHtml(p.slug)}">${p.status === 'hidden' ? '恢复显示' : '隐藏'}</button>
                                <button type="button" class="status-action-btn is-danger" data-del-slug="${escapeHtml(p.slug)}">删除</button>
                              </div>
                            </td>
                          </tr>
                        `;
                      })
                      .join('')
                  : '<tr><td colspan="7" class="empty-state">暂无文章，点击右上角「+ 撰写新文章」开始创作。</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>
    `;

    bodyEl.querySelector('#btn-new-article')?.addEventListener('click', () => {
      editingIsNew = true;
      editingOriginalSlug = '';
      slugAutoSync = true;
      editingArticle = {
        slug: '',
        title: '',
        shortTitle: '',
        category: '随笔思考',
        date: todayDotDate(atmosphere),
        tags: [],
        excerpt: '',
        status: 'published',
        pinned: false,
        markdown:
          '## 第一节标题\n\n在这里开始写作，点击上方工具栏即可像论坛发帖一样快速排版、插入代码块或直接拖拽/粘贴截图。\n\n> [!TIP] 小提示：右侧实时预览效果与前台文章页完全一致。\n'
      };
      render();
    });

    bodyEl.querySelector('#btn-restore-local-draft')?.addEventListener('click', () => {
      try {
        const cached = JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY));
        if (cached && cached.article) {
          editingArticle = cached.article;
          editingIsNew = Boolean(cached.isNew);
          editingOriginalSlug = cached.originalSlug || cached.article.slug || '';
          slugAutoSync = editingIsNew && !cached.article.slug;
          render();
        }
      } catch {
        // ignore
      }
    });

    bodyEl.querySelector('#btn-discard-local-draft')?.addEventListener('click', () => {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      render();
    });

    bodyEl.querySelectorAll('[data-edit-slug]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = draftArticles.find((a) => a.slug === btn.dataset.editSlug);
        if (!found) return;
        editingIsNew = false;
        editingOriginalSlug = found.slug;
        slugAutoSync = false; // keep existing URL intact unless user clicks 自动 or edits manually
        editingArticle = JSON.parse(JSON.stringify(found));
        render();
      });
    });

    bodyEl.querySelectorAll('[data-pin-slug]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = draftArticles.find((a) => a.slug === btn.dataset.pinSlug);
        if (target) {
          target.pinned = !target.pinned;
          dirtyArticles = true;
          onStateChanged?.();
          render();
        }
      });
    });

    bodyEl.querySelectorAll('[data-toggle-vis]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = draftArticles.find((a) => a.slug === btn.dataset.toggleVis);
        if (target) {
          target.status = target.status === 'hidden' ? 'published' : 'hidden';
          dirtyArticles = true;
          onStateChanged?.();
          render();
        }
      });
    });

    bodyEl.querySelectorAll('[data-del-slug]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.delSlug;
        if (!window.confirm(`确认删除文章 /post/${slug}？（需点击「推送更改上线」才会同步到 GitHub）`)) return;
        const idx = draftArticles.findIndex((a) => a.slug === slug);
        if (idx >= 0) {
          draftArticles.splice(idx, 1);
          dirtyArticles = true;
          onStateChanged?.();
          render();
        }
      });
    });

    bodyEl.querySelector('#btn-push-articles-list')?.addEventListener('click', async () => {
      if (!getAdminConfig().githubToken) {
        onNeedSettings?.();
        return;
      }
      const btn = bodyEl.querySelector('#btn-push-articles-list');
      const fb = bodyEl.querySelector('#articles-list-feedback');
      btn.disabled = true;
      btn.textContent = '正在推送到 GitHub…';
      try {
        const r = await publishArticlesToGitHub(draftArticles, `content(admin): update articles (${todayDotDate(atmosphere)})`);
        dirtyArticles = false;
        fb.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0;"><strong>推送成功！</strong>已更新 <code>articles.json</code>（Commit <code>${escapeHtml(r.sha)}</code>），GitHub Actions 约 30 秒后上线。</div>`;
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;"><strong>推送失败：</strong>${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '↑ 推送更改上线';
      }
    });
  }

  /* ------------------------------------------------------------------------
     SUB-VIEW B: FORUM-STYLE VISUAL MARKDOWN STUDIO
     ------------------------------------------------------------------------ */
  function renderVisualEditor() {
    const a = editingArticle;
    const hasGithub = Boolean(getAdminConfig().githubToken);
    const catOptions = CATEGORIES.filter((c) => c !== '全部');

    bodyEl.innerHTML = `
      <section class="liquid-glass liquid-glass-elevated admin-panel md-studio-panel">
        <div class="admin-panel-head">
          <div>
            <span class="swiss-kicker">VISUAL MARKDOWN STUDIO // 论坛式可视化写作台</span>
            <h2 class="panel-title" style="margin-top: 6px;">${editingIsNew ? '撰写新文章' : `编辑文章 · ${escapeHtml(a.title || a.slug)}`}</h2>
          </div>
          <div class="admin-btn-row">
            <button type="button" class="status-action-btn" id="btn-editor-back">← 返回文章列表</button>
            <div class="editor-mode-switch" role="group" aria-label="视图模式">
              <button type="button" class="status-action-btn ${editorMode === 'edit' ? 'is-tech-active' : ''}" data-ed-mode="edit">纯写作</button>
              <button type="button" class="status-action-btn ${editorMode === 'split' ? 'is-tech-active' : ''}" data-ed-mode="split">分栏预览</button>
              <button type="button" class="status-action-btn ${editorMode === 'preview' ? 'is-tech-active' : ''}" data-ed-mode="preview">全屏预览</button>
            </div>
            <button type="button" class="featured-cta" id="btn-editor-publish" style="border: none; cursor: pointer; padding: 9px 18px;">
              ${hasGithub ? '保存并推送上线 →' : '保存到列表（配置 Token 可推送）'}
            </button>
          </div>
        </div>

        <div id="editor-feedback" style="margin-top: 12px;"></div>

        <!-- Article Metadata Grid -->
        <div class="editor-meta-grid">
          <label class="admin-field" style="grid-column: span 2;">
            <span>文章标题 *</span>
            <input type="text" id="ed-title" class="swiss-search" placeholder="输入清晰醒目的文章标题，右侧 URL 将自动生成…" value="${escapeHtml(a.title)}" />
          </label>
          <label class="admin-field">
            <span>URL 路径 (Slug) * <small id="slug-sync-hint" style="font-weight: 500; color: var(--ink-mute);">${slugAutoSync ? '· 随标题自动生成' : '· 可手动修改'}</small></span>
            <div class="slug-input-group">
              <input type="text" id="ed-slug" class="swiss-search" placeholder="输入标题自动生成，也可手填" value="${escapeHtml(a.slug)}" />
              <button type="button" class="status-action-btn slug-auto-btn" id="btn-auto-slug" title="根据当前标题重新自动生成 URL">自动生成</button>
            </div>
          </label>
          <label class="admin-field">
            <span>栏目分类</span>
            <select id="ed-category" class="swiss-search">
              ${catOptions.map((c) => `<option value="${c}" ${a.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>
          <label class="admin-field">
            <span>发布状态</span>
            <select id="ed-status" class="swiss-search">
              <option value="published" ${a.status === 'published' ? 'selected' : ''}>已发布（前台可见）</option>
              <option value="draft" ${a.status === 'draft' ? 'selected' : ''}>草稿（仅后台可见）</option>
              <option value="hidden" ${a.status === 'hidden' ? 'selected' : ''}>隐藏（前台不展示）</option>
            </select>
          </label>
          <label class="admin-field">
            <span>发布日期</span>
            <input type="text" id="ed-date" class="swiss-search" value="${escapeHtml(a.date || todayDotDate(atmosphere))}" placeholder="2026.11.27" />
          </label>
          <label class="admin-field">
            <span>标签（英文逗号分隔）</span>
            <input type="text" id="ed-tags" class="swiss-search" placeholder="如 笔记, 工具, Linux" value="${escapeHtml((a.tags || []).join(', '))}" />
          </label>
          <label class="admin-field" style="justify-content: center;">
            <span>置顶设置</span>
            <label class="editor-checkbox">
              <input type="checkbox" id="ed-pinned" ${a.pinned ? 'checked' : ''} />
              <span>在首页与目录置顶推荐</span>
            </label>
          </label>
          <label class="admin-field" style="grid-column: 1 / -1;">
            <span>文章导语 / 摘要</span>
            <input type="text" id="ed-excerpt" class="swiss-search" placeholder="一句话概括文章核心内容（显示在文章列表卡片与文章顶部）" value="${escapeHtml(a.excerpt || '')}" />
          </label>
        </div>

        <!-- Forum-Style Formatting Toolbar -->
        <div class="md-toolbar" id="md-toolbar">
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="h2" title="一级章节标题">H2</button>
            <button type="button" class="md-tool-btn" data-tool="h3" title="二级小节标题">H3</button>
          </div>
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="bold" title="粗体 (Ctrl+B)"><strong>B</strong></button>
            <button type="button" class="md-tool-btn" data-tool="italic" title="斜体 (Ctrl+I)"><em>I</em></button>
            <button type="button" class="md-tool-btn" data-tool="strike" title="删除线"><s>S</s></button>
          </div>
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="quote" title="引用块">❝ 引用</button>
            <button type="button" class="md-tool-btn" data-tool="tip" title="绿色提示框">💡 提示</button>
            <button type="button" class="md-tool-btn" data-tool="warn" title="红色警示框">⚠ 警示</button>
          </div>
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="code" title="行内代码">&lt;/&gt; 行内</button>
            <button type="button" class="md-tool-btn" data-tool="codeblock" title="代码块">代码块</button>
            <button type="button" class="md-tool-btn" data-tool="table" title="插入表格">▦ 表格</button>
          </div>
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="ul" title="无序列表">• 列表</button>
            <button type="button" class="md-tool-btn" data-tool="ol" title="有序列表">1. 编号</button>
            <button type="button" class="md-tool-btn" data-tool="task" title="待办清单">☑ 清单</button>
            <button type="button" class="md-tool-btn" data-tool="hr" title="分割线">—</button>
          </div>
          <div class="md-tool-group">
            <button type="button" class="md-tool-btn" data-tool="link" title="插入链接 (Ctrl+K)">🔗 链接</button>
            <button type="button" class="md-tool-btn is-accent" id="btn-upload-img" title="上传并压缩图片到仓库（也支持直接拖拽/粘贴截图）">🖼 传图</button>
            <input type="file" id="ed-img-file" accept="image/*" hidden />
          </div>
        </div>

        <!-- Split / Edit / Preview Workspace -->
        <div class="md-workspace is-mode-${editorMode}" id="md-workspace">
          <div class="md-pane md-pane-edit">
            <textarea id="ed-markdown" class="md-textarea" spellcheck="false" placeholder="支持标准 Markdown、表格、提示框，也支持直接把截图拖进来或 Ctrl+V 粘贴上传…">${escapeHtml(a.markdown || '')}</textarea>
          </div>
          <div class="md-pane md-pane-preview">
            <div class="md-preview-label swiss-mono">LIVE PREVIEW · 实时排版预览</div>
            <div class="md-preview-body" id="ed-preview"></div>
          </div>
        </div>

        <div class="md-studio-foot">
          <span class="swiss-mono" id="ed-metrics">字数：0 · 预计阅读 1 MIN · 章节：0</span>
          <span class="swiss-mono" id="ed-autosave-status" style="color: var(--ink-mute);">支持拖拽或 Ctrl+V 粘贴截图自动压缩上传</span>
        </div>
      </section>
    `;

    const titleInput = bodyEl.querySelector('#ed-title');
    const slugInput = bodyEl.querySelector('#ed-slug');
    const slugHint = bodyEl.querySelector('#slug-sync-hint');
    const catSelect = bodyEl.querySelector('#ed-category');
    const statusSelect = bodyEl.querySelector('#ed-status');
    const dateInput = bodyEl.querySelector('#ed-date');
    const tagsInput = bodyEl.querySelector('#ed-tags');
    const pinnedCheck = bodyEl.querySelector('#ed-pinned');
    const excerptInput = bodyEl.querySelector('#ed-excerpt');
    const mdTextarea = bodyEl.querySelector('#ed-markdown');
    const previewEl = bodyEl.querySelector('#ed-preview');
    const metricsEl = bodyEl.querySelector('#ed-metrics');
    const autoSaveEl = bodyEl.querySelector('#ed-autosave-status');
    const fbEl = bodyEl.querySelector('#editor-feedback');
    const imgFileInput = bodyEl.querySelector('#ed-img-file');

    const updateSlugHint = () => {
      if (slugHint) {
        slugHint.textContent = slugAutoSync ? '· 随标题自动生成' : '· 已手动指定';
      }
    };

    const syncDraftFromInputs = () => {
      editingArticle.title = titleInput.value.trim();
      editingArticle.shortTitle = editingArticle.title;
      editingArticle.slug = slugInput.value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      editingArticle.category = catSelect.value;
      editingArticle.status = statusSelect.value;
      editingArticle.date = dateInput.value.trim() || todayDotDate(atmosphere);
      editingArticle.tags = tagsInput.value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      editingArticle.pinned = pinnedCheck.checked;
      editingArticle.excerpt = excerptInput.value.trim();
      editingArticle.markdown = mdTextarea.value;
      editingArticle.readTime = estimateReadTime(mdTextarea.value);
    };

    const renderLivePreview = () => {
      syncDraftFromInputs();
      const parsed = parseMarkdown(editingArticle.markdown);
      let previewHtml = parsed.html;
      for (const [repoUrl, blobUrl] of uploadedPreviewMap.entries()) {
        previewHtml = previewHtml.split(repoUrl).join(blobUrl);
      }
      previewEl.innerHTML = `
        ${editingArticle.title ? `<h1 class="art-h1" style="font-size: 28px; margin-bottom: 10px;">${escapeHtml(editingArticle.title)}</h1>` : ''}
        ${editingArticle.excerpt ? `<p class="art-lead" style="font-size: 14.5px; margin-bottom: 18px;">${escapeHtml(editingArticle.excerpt)}</p>` : ''}
        <div class="md-article-body">${previewHtml || '<p class="empty-state">左侧开始输入，此处即时呈现效果…</p>'}</div>
      `;
      const wc = estimateWordCount(editingArticle.markdown);
      metricsEl.textContent = `字数：${wc} · 预计阅读 ${estimateReadTime(editingArticle.markdown)} · 章节：${parsed.toc.length}`;

      try {
        localStorage.setItem(
          LOCAL_DRAFT_KEY,
          JSON.stringify({ isNew: editingIsNew, originalSlug: editingOriginalSlug, article: editingArticle })
        );
        autoSaveEl.textContent = `草稿已自动暂存于本机 · ${atmosphere.getSnapshot().clockShort}`;
      } catch {
        // ignore
      }
    };

    renderLivePreview();

    // Real-time auto-slug while typing title
    titleInput.addEventListener('input', () => {
      if (slugAutoSync) {
        slugInput.value = slugifyTitle(titleInput.value, dateInput.value);
      }
      renderLivePreview();
    });

    // If user manually edits slug, pause auto-sync; if cleared completely, resume auto-sync
    slugInput.addEventListener('input', () => {
      slugAutoSync = slugInput.value.trim() === '';
      updateSlugHint();
      renderLivePreview();
    });

    bodyEl.querySelector('#btn-auto-slug')?.addEventListener('click', () => {
      slugAutoSync = true;
      slugInput.value = slugifyTitle(titleInput.value, dateInput.value);
      updateSlugHint();
      renderLivePreview();
    });

    [catSelect, statusSelect, dateInput, tagsInput, pinnedCheck, excerptInput, mdTextarea].forEach((el) => {
      el?.addEventListener('input', renderLivePreview);
      el?.addEventListener('change', renderLivePreview);
    });

    bodyEl.querySelector('#btn-editor-back')?.addEventListener('click', () => {
      editingArticle = null;
      render();
    });

    bodyEl.querySelectorAll('[data-ed-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editorMode = btn.dataset.edMode;
        const ws = bodyEl.querySelector('#md-workspace');
        ws.className = `md-workspace is-mode-${editorMode}`;
        bodyEl.querySelectorAll('[data-ed-mode]').forEach((b) => {
          b.classList.toggle('is-tech-active', b.dataset.edMode === editorMode);
        });
      });
    });

    // Toolbar actions
    const runTool = (tool) => {
      switch (tool) {
        case 'h2':
          insertBlock(mdTextarea, '## 新章节标题');
          break;
        case 'h3':
          insertBlock(mdTextarea, '### 小节标题');
          break;
        case 'bold':
          wrapSelection(mdTextarea, '**', '**', '加粗文字');
          break;
        case 'italic':
          wrapSelection(mdTextarea, '*', '*', '斜体文字');
          break;
        case 'strike':
          wrapSelection(mdTextarea, '~~', '~~', '删除文字');
          break;
        case 'quote':
          insertBlock(mdTextarea, '> 引用内容写在这里');
          break;
        case 'tip':
          insertBlock(mdTextarea, '> [!TIP] 提示：这里写实用技巧或结论。');
          break;
        case 'warn':
          insertBlock(mdTextarea, '> [!WARN] 注意：这里写避坑或重点提醒。');
          break;
        case 'code':
          wrapSelection(mdTextarea, '`', '`', 'command');
          break;
        case 'codeblock':
          insertBlock(mdTextarea, '```bash\n# 在这里粘贴命令或代码\necho "Hello Gavin\'s Blog"\n```');
          break;
        case 'table':
          insertBlock(mdTextarea, '| 项目 | 说明 | 备注 |\n| --- | --- | --- |\n| 示例 A | 内容描述 | 推荐 |\n| 示例 B | 内容描述 | 可选 |');
          break;
        case 'ul':
          insertBlock(mdTextarea, '- 列表项 1\n- 列表项 2');
          break;
        case 'ol':
          insertBlock(mdTextarea, '1. 第一步\n2. 第二步');
          break;
        case 'task':
          insertBlock(mdTextarea, '- [x] 已完成事项\n- [ ] 待完成事项');
          break;
        case 'hr':
          insertBlock(mdTextarea, '---');
          break;
        case 'link': {
          const url = window.prompt('请输入链接地址（https://...）：', 'https://');
          if (url) wrapSelection(mdTextarea, '[', `](${url})`, '链接文字');
          break;
        }
        default:
          break;
      }
    };

    bodyEl.querySelector('#md-toolbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tool]');
      if (btn) runTool(btn.dataset.tool);
    });

    // Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, Tab)
    mdTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        mdTextarea.setRangeText('  ', mdTextarea.selectionStart, mdTextarea.selectionEnd, 'end');
        renderLivePreview();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          runTool('bold');
        } else if (k === 'i') {
          e.preventDefault();
          runTool('italic');
        } else if (k === 'k') {
          e.preventDefault();
          runTool('link');
        }
      }
    });

    // Image upload handler (Button / Drag & Drop / Paste screenshot)
    const handleImageUpload = async (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      if (!getAdminConfig().githubToken) {
        const extUrl = window.prompt('尚未配置 GitHub Token 无法直传仓库图床。你也可以直接粘贴外链图片 URL：', 'https://');
        if (extUrl) insertBlock(mdTextarea, `![图片说明](${extUrl})`);
        return;
      }
      fbEl.innerHTML = '<div class="swiss-callout" style="margin: 0;">正在压缩并上传图片到 GitHub 仓库…</div>';
      try {
        const localBlobUrl = URL.createObjectURL(file);
        const res = await uploadPostImageToGitHub(file, slugInput.value || 'post');
        uploadedPreviewMap.set(res.publicUrl, localBlobUrl);
        insertBlock(mdTextarea, `![${file.name.replace(/\.[^.]+$/, '')}](${res.publicUrl})`);
        fbEl.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0;"><strong>图片上传成功！</strong>已压缩为 ${res.width}×${res.height}（约 ${res.approxKb} KB）并插入文章。</div>`;
      } catch (err) {
        fbEl.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;"><strong>传图失败：</strong>${escapeHtml(err.message)}</div>`;
      }
    };

    bodyEl.querySelector('#btn-upload-img')?.addEventListener('click', () => imgFileInput.click());
    imgFileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) handleImageUpload(f);
      imgFileInput.value = '';
    });

    mdTextarea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          handleImageUpload(item.getAsFile());
          break;
        }
      }
    });

    mdTextarea.addEventListener('dragover', (e) => {
      e.preventDefault();
      mdTextarea.classList.add('is-dragover');
    });
    mdTextarea.addEventListener('dragleave', () => mdTextarea.classList.remove('is-dragover'));
    mdTextarea.addEventListener('drop', (e) => {
      e.preventDefault();
      mdTextarea.classList.remove('is-dragover');
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) handleImageUpload(f);
    });

    // Save & Push to GitHub
    bodyEl.querySelector('#btn-editor-publish')?.addEventListener('click', async () => {
      syncDraftFromInputs();
      if (!editingArticle.title) {
        fbEl.innerHTML = '<div class="swiss-callout is-warn" style="margin: 0;">请先填写文章标题。</div>';
        return;
      }
      if (!editingArticle.slug) {
        editingArticle.slug = slugifyTitle(editingArticle.title, editingArticle.date);
        slugInput.value = editingArticle.slug;
      }

      const conflict = draftArticles.find(
        (x) => x.slug === editingArticle.slug && (editingIsNew || x.slug !== editingOriginalSlug)
      );
      if (conflict) {
        fbEl.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">Slug <code>${escapeHtml(editingArticle.slug)}</code> 已被其他文章占用，请换一个 URL 路径。</div>`;
        return;
      }

      const cleanRecord = {
        slug: editingArticle.slug,
        title: editingArticle.title,
        shortTitle: editingArticle.shortTitle || editingArticle.title,
        category: editingArticle.category,
        date: editingArticle.date,
        readTime: estimateReadTime(editingArticle.markdown),
        excerpt: editingArticle.excerpt,
        tags: editingArticle.tags,
        status: editingArticle.status,
        pinned: Boolean(editingArticle.pinned),
        markdown: editingArticle.markdown
      };

      const targetIdx = editingIsNew
        ? -1
        : draftArticles.findIndex((x) => x.slug === editingOriginalSlug);

      if (targetIdx >= 0) draftArticles[targetIdx] = cleanRecord;
      else draftArticles.unshift(cleanRecord);

      dirtyArticles = true;
      editingOriginalSlug = cleanRecord.slug;
      onStateChanged?.();

      if (!getAdminConfig().githubToken) {
        fbEl.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">已保存到当前会话文章列表；前往「06 系统配置」填写 GitHub Token 后即可一键推送上线。</div>';
        return;
      }

      const btn = bodyEl.querySelector('#btn-editor-publish');
      btn.disabled = true;
      btn.textContent = '正在推送到 GitHub…';
      try {
        const res = await publishArticlesToGitHub(
          draftArticles,
          `post(admin): ${editingIsNew ? 'publish' : 'update'} ${cleanRecord.slug}`
        );
        dirtyArticles = false;
        editingIsNew = false;
        localStorage.removeItem(LOCAL_DRAFT_KEY);
        fbEl.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0;"><strong>文章已推送上线！</strong>Commit <code>${escapeHtml(res.sha)}</code> 已触发自动构建，约 30 秒后生效（<a href="${escapeHtml(res.url)}" target="_blank" rel="noopener noreferrer">查看提交</a>）。</div>`;
      } catch (err) {
        fbEl.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;"><strong>推送失败：</strong>${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '保存并推送上线 →';
      }
    });
  }

  render();
}
