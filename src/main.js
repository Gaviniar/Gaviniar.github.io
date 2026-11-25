import './styles/main.css';
import {
  AtmosphereController,
  TIME_PHASES,
  SEASONS,
  WEATHERS
} from './engine/atmosphere.js';
import { ManorCanvasFX } from './engine/canvasFx.js';
import { BackdropManager } from './engine/backdropManager.js';
import { SITE_CONFIG, MICRO_NOTES } from './data/siteConfig.js';
import { CATEGORIES, POSTS, getPostBySlug, getAllTags } from './data/posts.js';

const appRoot = document.getElementById('app-root');
const canvasEl = document.getElementById('atmosphere-canvas');
const parallaxEl = document.getElementById('manor-parallax');
const slotA = document.getElementById('manor-slot-a');
const slotB = document.getElementById('manor-slot-b');

const atmoPanel = document.getElementById('atmosphere-panel');
const atmoToggle = document.getElementById('atmosphere-toggle');
const autoTimeBtn = document.getElementById('auto-time-btn');
const timePillsEl = document.getElementById('time-pills');
const seasonPillsEl = document.getElementById('season-pills');
const weatherPillsEl = document.getElementById('weather-pills');

const clockEl = document.getElementById('beijing-clock');
const phaseLabelEl = document.getElementById('hud-phase-label');
const envLabelEl = document.getElementById('hud-env-label');
const zenToggle = document.getElementById('zen-toggle');
const zenRestoreBar = document.getElementById('zen-restore-bar');
const zenExitBtn = document.getElementById('zen-exit-btn');
const zenClockEl = document.getElementById('zen-clock');
const zenSceneDescEl = document.getElementById('zen-scene-desc');

let canvasFX = null;
let atmosphere = null;
let backdropManager = null;
let scrollCleanup = null;

/* ==========================================================================
   ATMOSPHERE CONTROLLER UI & SYNC
   ========================================================================== */
function renderAtmosphereControls() {
  timePillsEl.innerHTML = TIME_PHASES.map(
    (p) => `
      <button type="button" class="atmo-pill" data-time-pick="${p.id}" title="${p.range} 北京时间">
        <span class="atmo-pill-main">${p.label}</span>
        <span class="atmo-pill-sub">${p.range.split('–')[0]}</span>
      </button>
    `
  ).join('');

  seasonPillsEl.innerHTML = SEASONS.map(
    (s) => `
      <button type="button" class="atmo-pill" data-season-pick="${s.id}" title="${s.desc}">
        <span class="atmo-pill-main">${s.label}</span>
        <span class="atmo-pill-sub">${s.en.slice(0, 3)}</span>
      </button>
    `
  ).join('');

  weatherPillsEl.innerHTML = WEATHERS.map(
    (w) => `
      <button type="button" class="atmo-pill" data-weather-pick="${w.id}" title="${w.desc}">
        <span class="atmo-pill-main">${w.label}</span>
        <span class="atmo-pill-sub">${w.en}</span>
      </button>
    `
  ).join('');

  timePillsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-time-pick]');
    if (btn) atmosphere.setTimePhase(btn.dataset.timePick);
  });

  seasonPillsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-season-pick]');
    if (btn) atmosphere.setSeason(btn.dataset.seasonPick);
  });

  weatherPillsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-weather-pick]');
    if (btn) atmosphere.setWeather(btn.dataset.weatherPick);
  });

  autoTimeBtn.addEventListener('click', () => atmosphere.enableAutoTime());

  atmoToggle.addEventListener('click', () => {
    const isHidden = atmoPanel.hasAttribute('hidden');
    if (isHidden) {
      atmoPanel.removeAttribute('hidden');
      atmoToggle.setAttribute('aria-expanded', 'true');
    } else {
      atmoPanel.setAttribute('hidden', '');
      atmoToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (!atmoPanel.hasAttribute('hidden') && !e.target.closest('#glass-dock')) {
      atmoPanel.setAttribute('hidden', '');
      atmoToggle.setAttribute('aria-expanded', 'false');
    }
  });

  const setZen = (enabled) => {
    document.body.classList.toggle('is-zen', enabled);
    if (enabled) {
      atmoPanel.setAttribute('hidden', '');
      atmoToggle.setAttribute('aria-expanded', 'false');
      zenRestoreBar.removeAttribute('hidden');
    } else {
      zenRestoreBar.setAttribute('hidden', '');
    }
  };

  zenToggle.addEventListener('click', () => setZen(true));
  zenExitBtn.addEventListener('click', () => setZen(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('is-zen')) {
      setZen(false);
    }
  });
}

function syncAtmosphereHUD(snap) {
  clockEl.textContent = snap.clockShort;
  phaseLabelEl.textContent = snap.phaseMeta.label;
  envLabelEl.textContent = `${snap.seasonMeta.label} / ${snap.weatherMeta.label}`;

  zenClockEl.textContent = `${snap.clockFull} CST`;
  zenSceneDescEl.textContent = `${snap.phaseMeta.label} · ${snap.seasonMeta.label} · ${snap.weatherMeta.label}`;

  autoTimeBtn.classList.toggle('is-active', snap.autoTime);
  timePillsEl.querySelectorAll('[data-time-pick]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.timePick === snap.timePhase);
  });
  seasonPillsEl.querySelectorAll('[data-season-pick]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.seasonPick === snap.season);
  });
  weatherPillsEl.querySelectorAll('[data-weather-pick]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.weatherPick === snap.weather);
  });

  const homeClock = document.getElementById('home-live-clock');
  const homeMeta = document.getElementById('home-live-meta');
  const homeMood = document.getElementById('home-live-mood');
  if (homeClock) homeClock.textContent = snap.clockFull;
  if (homeMeta) {
    homeMeta.textContent = `UTC+8 · ${snap.phaseMeta.label} (${snap.phaseMeta.en}) · ${snap.seasonMeta.label} · ${snap.weatherMeta.label}`;
  }
  if (homeMood) homeMood.textContent = snap.phaseMeta.mood;
}

/* ==========================================================================
   LIQUID GLASS SPECULAR SHEEN CURSOR TRACKING
   ========================================================================== */
function attachGlassSpecularHover() {
  document.querySelectorAll('.liquid-glass').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--gx', `${x.toFixed(1)}%`);
      card.style.setProperty('--gy', `${y.toFixed(1)}%`);
    }, { passive: true });
  });
}

/* ==========================================================================
   SHARED COMPONENTS
   ========================================================================== */
function renderFooter() {
  return `
    <footer class="liquid-glass site-footer">
      <span>© ${SITE_CONFIG.established} ${SITE_CONFIG.brandName} · ${SITE_CONFIG.bio}</span>
      <span>LIQUID GLASS × SWISS GRID · ASIA/SHANGHAI (UTC+8)</span>
    </footer>
  `;
}

function renderPostCard(post) {
  return `
    <article class="post-feed-card" data-post-href="#/post/${post.slug}">
      <div class="post-card-meta">
        <div class="post-card-left-meta">
          <span class="essay-num">NO.${post.index}</span>
          <span class="swiss-tag ${post.category === '技术攻略' ? 'swiss-tag-tech' : ''}">${post.category}</span>
          ${post.pinned ? '<span class="swiss-tag swiss-tag-accent">置顶</span>' : ''}
        </div>
        <span class="post-card-date">${post.date} · ${post.readTime}</span>
      </div>
      <h3 class="post-card-title">
        <a href="#/post/${post.slug}">${post.title}</a>
      </h3>
      <p class="post-card-excerpt">${post.excerpt}</p>
      <div class="post-card-foot">
        <div class="post-card-tags">
          ${post.tags.map((t) => `<a class="mini-tag" href="#/posts?tag=${encodeURIComponent(t)}">#${t}</a>`).join('')}
        </div>
        <a class="post-read-link" href="#/post/${post.slug}">阅读全文 →</a>
      </div>
    </article>
  `;
}

/* ==========================================================================
   01 / PERSONAL BLOG HOME VIEW
   ========================================================================== */
function renderHomeView() {
  const snap = atmosphere.getSnapshot();
  const tags = getAllTags();

  appRoot.innerHTML = `
    <div class="home-grid">
      <!-- Personal Blog Masthead + Live Manor HUD -->
      <section class="liquid-glass home-hero">
        <div class="home-hero-top">
          <span class="swiss-kicker">PERSONAL BLOG // ${SITE_CONFIG.brandName.toUpperCase()}</span>
          <span class="home-coords">${SITE_CONFIG.coords}</span>
        </div>

        <div class="home-hero-body">
          <div>
            <h1 class="home-title">${SITE_CONFIG.brandName}</h1>
            <p class="home-bio">${SITE_CONFIG.bio}</p>
            <div class="home-meta-strip">
              <div class="home-stat"><strong>${String(POSTS.length).padStart(2, '0')}</strong><span>已发布文章</span></div>
              <div class="home-stat"><strong>${String(CATEGORIES.length - 1).padStart(2, '0')}</strong><span>主题栏目</span></div>
              <div class="home-stat"><strong>${String(MICRO_NOTES.length).padStart(2, '0')}</strong><span>碎碎念</span></div>
              ${
                SITE_CONFIG.links.length
                  ? `<div class="home-quick-links">
                      ${SITE_CONFIG.links
                        .map(
                          (l) =>
                            `<a class="quick-chip" href="${l.href}" ${l.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a>`
                        )
                        .join('')}
                    </div>`
                  : ''
              }
            </div>
          </div>

          <aside class="home-side-status" aria-label="庄园实时气象">
            <span class="swiss-mono status-eyebrow">MANOR LIVE TELEMETRY</span>
            <div class="status-clock-big" id="home-live-clock">${snap.clockFull}</div>
            <div class="status-meta-line" id="home-live-meta">
              UTC+8 · ${snap.phaseMeta.label} (${snap.phaseMeta.en}) · ${snap.seasonMeta.label} · ${snap.weatherMeta.label}
            </div>
            <p class="status-mood" id="home-live-mood">${snap.phaseMeta.mood}</p>
            <div class="status-actions">
              <button type="button" class="status-action-btn" id="hero-open-atmo">调节季节与天气</button>
              <button type="button" class="status-action-btn" id="hero-open-zen">纯粹赏景</button>
            </div>
          </aside>
        </div>
      </section>

      <!-- Asymmetric 2-Column Personal Blog Body (8 cols Posts Feed + 4 cols Personal Sidebar) -->
      <div class="blog-layout">
        <!-- Main Column: Categorized Posts Feed -->
        <section class="liquid-glass liquid-glass-elevated feed-panel">
          <div class="feed-head">
            <div>
              <span class="swiss-kicker">RECENT WRITING // 最新文章与攻略</span>
              <h2 class="panel-title" style="margin-top: 8px;">全部发布</h2>
            </div>
            <a class="view-all-link" href="#/posts">按关键词检索 →</a>
          </div>

          <div class="filter-bar" id="home-cat-bar" role="tablist" aria-label="按分类筛选">
            ${CATEGORIES.map(
              (cat, i) => `
              <button type="button" class="filter-pill ${i === 0 ? 'is-active' : ''}" data-home-cat="${cat}">
                ${cat}
              </button>
            `
            ).join('')}
          </div>

          <div class="post-feed-list" id="home-post-list">
            ${POSTS.map(renderPostCard).join('')}
          </div>
        </section>

        <!-- Right Sidebar: Personal Blog Modules -->
        <aside class="blog-sidebar">
          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">NOW // 此刻在做</span>
            </div>
            ${
              SITE_CONFIG.nowList.length
                ? `<ul class="now-list">
                    ${SITE_CONFIG.nowList
                      .map(
                        (item) => `
                      <li>
                        <span class="swiss-tag">${item.tag}</span>
                        <span>${item.text}</span>
                      </li>
                    `
                      )
                      .join('')}
                  </ul>`
                : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无内容</p>'
            }
          </section>

          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">FIELD NOTES // 碎碎念</span>
              <a class="sidebar-more" href="#/notes">全部 →</a>
            </div>
            ${
              MICRO_NOTES.length
                ? `<div class="mini-notes-list">
                    ${MICRO_NOTES.slice(0, 2)
                      .map(
                        (n) => `
                      <div class="mini-note-item">
                        <div class="mini-note-meta">${n.date} · ${n.phase} · ${n.mood}</div>
                        <p class="mini-note-text">${n.content}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>`
                : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无内容，待日后随手落笔。</p>'
            }
          </section>

          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">INDEX // 标签索引</span>
              <span class="swiss-mono sidebar-meta">${tags.length} TAGS</span>
            </div>
            <div class="tag-matrix">
              ${tags
                .map(
                  (t) => `
                <a class="tag-chip" href="#/posts?tag=${encodeURIComponent(t.name)}">
                  <span>#${t.name}</span>
                  <span class="tag-count">${t.count}</span>
                </a>
              `
                )
                .join('')}
            </div>
          </section>
        </aside>
      </div>

      ${renderFooter()}
    </div>
  `;

  // Wire home quick atmosphere / zen buttons
  document.getElementById('hero-open-atmo')?.addEventListener('click', (e) => {
    e.stopPropagation();
    atmoPanel.removeAttribute('hidden');
    atmoToggle.setAttribute('aria-expanded', 'true');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('hero-open-zen')?.addEventListener('click', () => {
    zenToggle.click();
  });

  // Wire home category filter pills
  const catBar = document.getElementById('home-cat-bar');
  const postList = document.getElementById('home-post-list');
  catBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-home-cat]');
    if (!btn) return;
    const selected = btn.dataset.homeCat;
    catBar.querySelectorAll('[data-home-cat]').forEach((el) => {
      el.classList.toggle('is-active', el === btn);
    });
    const filtered = selected === '全部' ? POSTS : POSTS.filter((p) => p.category === selected);
    postList.innerHTML = filtered.length
      ? filtered.map(renderPostCard).join('')
      : '<p class="empty-state">该栏目暂未发布文章。</p>';
    bindPostCardClicks();
  });

  bindPostCardClicks();
}

function bindPostCardClicks() {
  appRoot.querySelectorAll('[data-post-href]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      window.location.hash = card.dataset.postHref;
    });
  });
}

/* ==========================================================================
   02 / FULL POSTS DIRECTORY (SEARCH + CATEGORY + TAG FILTERS)
   ========================================================================== */
function renderPostsDirectoryView(initialTag = '') {
  const tags = getAllTags();
  let activeCat = '全部';
  let activeTag = initialTag;
  let query = '';

  appRoot.innerHTML = `
    <section class="liquid-glass liquid-glass-elevated directory-panel">
      <div class="directory-header">
        <div>
          <span class="swiss-kicker">ESSAYS &amp; GUIDES // 文章归档与检索</span>
          <h1 class="art-h1" style="margin: 10px 0 0; font-size: clamp(28px, 3.6vw, 42px);">全部文章与攻略</h1>
        </div>
        <div class="search-wrap">
          <input type="search" id="post-search-input" class="swiss-search" placeholder="搜索标题、关键词或标签…" autocomplete="off" />
        </div>
      </div>

      <div class="filter-bar" id="dir-cat-bar">
        ${CATEGORIES.map(
          (c, i) => `<button type="button" class="filter-pill ${i === 0 ? 'is-active' : ''}" data-dir-cat="${c}">${c}</button>`
        ).join('')}
      </div>

      <div class="tag-filter-row" id="dir-tag-bar">
        <button type="button" class="mini-tag-btn ${!activeTag ? 'is-active' : ''}" data-dir-tag="">全部标签</button>
        ${tags
          .map(
            (t) => `
          <button type="button" class="mini-tag-btn ${activeTag === t.name ? 'is-active' : ''}" data-dir-tag="${t.name}">
            #${t.name} (${t.count})
          </button>
        `
          )
          .join('')}
      </div>

      <div class="dir-count-line" id="dir-count-line"></div>
      <div class="post-feed-list" id="dir-post-list"></div>
    </section>
    ${renderFooter()}
  `;

  const searchInput = document.getElementById('post-search-input');
  const catBar = document.getElementById('dir-cat-bar');
  const tagBar = document.getElementById('dir-tag-bar');
  const listEl = document.getElementById('dir-post-list');
  const countEl = document.getElementById('dir-count-line');

  const updateList = () => {
    const q = query.trim().toLowerCase();
    const matched = POSTS.filter((p) => {
      const catOk = activeCat === '全部' || p.category === activeCat;
      const tagOk = !activeTag || p.tags.includes(activeTag);
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && tagOk && qOk;
    });

    countEl.textContent = `MATCHING ${String(matched.length).padStart(2, '0')} / ${String(POSTS.length).padStart(2, '0')} ENTRIES${activeTag ? ` · TAG: #${activeTag}` : ''}`;
    listEl.innerHTML = matched.length
      ? matched.map(renderPostCard).join('')
      : '<p class="empty-state">没有找到匹配的文章，试试更换关键词或清空标签筛选。</p>';
    bindPostCardClicks();
  };

  searchInput.addEventListener('input', (e) => {
    query = e.target.value;
    updateList();
  });

  catBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dir-cat]');
    if (!btn) return;
    activeCat = btn.dataset.dirCat;
    catBar.querySelectorAll('[data-dir-cat]').forEach((el) => el.classList.toggle('is-active', el === btn));
    updateList();
  });

  tagBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dir-tag]');
    if (!btn) return;
    activeTag = btn.dataset.dirTag;
    tagBar.querySelectorAll('[data-dir-tag]').forEach((el) => el.classList.toggle('is-active', el === btn));
    updateList();
  });

  updateList();
}

/* ==========================================================================
   03 / MICRO-NOTES (碎碎念 / 庄园时间轴)
   ========================================================================== */
function renderNotesView() {
  appRoot.innerHTML = `
    <section class="liquid-glass liquid-glass-elevated directory-panel">
      <div class="panel-head">
        <div>
          <span class="swiss-kicker">FIELD NOTES // 庄园碎碎念</span>
          <h1 class="art-h1" style="margin: 10px 0 0; font-size: clamp(28px, 3.6vw, 42px);">随手记下的片刻与灵感</h1>
        </div>
        <span class="swiss-mono" style="font-size: 12px; color: var(--ink-mute);">${MICRO_NOTES.length} NOTES</span>
      </div>

      <div class="notes-timeline">
        ${
          MICRO_NOTES.length
            ? MICRO_NOTES.map(
                (n, idx) => `
                <article class="note-entry">
                  <div class="note-stamp">
                    <span class="essay-num">${String(MICRO_NOTES.length - idx).padStart(2, '0')}</span>
                    <div>
                      <div class="note-date">${n.date}</div>
                      <div class="note-sub">${n.time} · ${n.phase}</div>
                    </div>
                    <span class="swiss-tag">${n.mood}</span>
                  </div>
                  <p class="note-body">${n.content}</p>
                </article>
              `
              ).join('')
            : '<p class="empty-state">暂未发布碎碎念。</p>'
        }
      </div>
    </section>
    ${renderFooter()}
  `;
}

/* ==========================================================================
   04 / ARTICLE READER VIEW (WITH PREV / NEXT BLOG NAVIGATION)
   ========================================================================== */
function renderArticleView(slug) {
  const post = getPostBySlug(slug);
  const idx = POSTS.findIndex((p) => p.slug === post.slug);
  const prevPost = idx > 0 ? POSTS[idx - 1] : null;
  const nextPost = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;
  const currentDensity = document.documentElement.dataset.readingGlass || 'balanced';

  appRoot.innerHTML = `
    <div class="article-shell">
      <!-- Sticky Swiss TOC & Reading Controls Rail -->
      <aside class="liquid-glass article-rail" aria-label="文章章节索引">
        <a href="#/posts" class="rail-back">← RETURN / 全部文章</a>

        <div class="rail-progress-wrap">
          <div class="rail-progress-meta">
            <span>READING PROGRESS</span>
            <span id="read-progress-pct">0%</span>
          </div>
          <div class="rail-progress-track">
            <div class="rail-progress-bar" id="read-progress-bar"></div>
          </div>
        </div>

        <ul class="toc-list" id="toc-list">
          ${post.toc
            .map(
              (item, i) => `
            <li>
              <a class="toc-link ${i === 0 ? 'is-active' : ''}" href="#${item.id}" data-toc-id="${item.id}">
                <span class="toc-idx">${item.num}</span>
                <span>${item.label}</span>
              </a>
            </li>
          `
            )
            .join('')}
        </ul>

        <div class="rail-divider"></div>

        <button type="button" class="glass-density-toggle" id="glass-density-btn">
          <span>玻璃通透度</span>
          <span class="swiss-mono" id="glass-density-label" style="color: var(--accent);">
            ${currentDensity === 'solid' ? '专注深磨砂' : '标准透光'}
          </span>
        </button>

        <div class="rail-meta-grid">
          <div class="rail-meta-row"><span>CATEGORY</span><span class="rail-meta-val">${post.category}</span></div>
          <div class="rail-meta-row"><span>PUBLISHED</span><span class="rail-meta-val">${post.date}</span></div>
          <div class="rail-meta-row"><span>DURATION</span><span class="rail-meta-val">${post.readTime}</span></div>
        </div>
      </aside>

      <!-- Elevated Liquid Glass Swiss Monograph Paper -->
      <article class="liquid-glass liquid-glass-elevated article-paper">
        ${post.renderContent()}

        <!-- Prev / Next Article Navigation -->
        <nav class="article-pager" aria-label="上下篇导航">
          ${
            prevPost
              ? `<a class="pager-link" href="#/post/${prevPost.slug}">
                  <span class="pager-kicker">← PREV · ${prevPost.category}</span>
                  <span class="pager-title">${prevPost.shortTitle}</span>
                </a>`
              : `<a class="pager-link" href="#/posts">
                  <span class="pager-kicker">← ARCHIVE</span>
                  <span class="pager-title">返回全部文章目录</span>
                </a>`
          }
          ${
            nextPost
              ? `<a class="pager-link is-right" href="#/post/${nextPost.slug}">
                  <span class="pager-kicker">NEXT · ${nextPost.category} →</span>
                  <span class="pager-title">${nextPost.shortTitle}</span>
                </a>`
              : `<a class="pager-link is-right" href="#/">
                  <span class="pager-kicker">HOME →</span>
                  <span class="pager-title">回到博客首页</span>
                </a>`
          }
        </nav>
      </article>
    </div>
    ${renderFooter()}
  `;

  setupArticleInteractions(post);
}

function setupArticleInteractions(post) {
  appRoot.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = '已复制 ✓';
        btn.classList.add('is-copied');
        setTimeout(() => {
          btn.textContent = old;
          btn.classList.remove('is-copied');
        }, 1800);
      } catch {
        btn.textContent = '请手动复制';
      }
    });
  });

  appRoot.querySelectorAll('[data-toc-id]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.tocId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const densityBtn = document.getElementById('glass-density-btn');
  const densityLabel = document.getElementById('glass-density-label');
  densityBtn?.addEventListener('click', () => {
    const next = document.documentElement.dataset.readingGlass === 'solid' ? 'balanced' : 'solid';
    document.documentElement.dataset.readingGlass = next;
    densityLabel.textContent = next === 'solid' ? '专注深磨砂' : '标准透光';
  });

  const progressBar = document.getElementById('read-progress-bar');
  const progressPct = document.getElementById('read-progress-pct');
  const sections = post.toc.map((t) => document.getElementById(t.id)).filter(Boolean);

  const onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPct) progressPct.textContent = `${pct}%`;

    let activeId = sections[0]?.id;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40;
    if (nearBottom && sections.length) {
      activeId = sections[sections.length - 1].id;
    } else {
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= 240) {
          activeId = sec.id;
        }
      }
    }
    if (activeId) {
      appRoot.querySelectorAll('[data-toc-id]').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.tocId === activeId);
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  scrollCleanup = () => window.removeEventListener('scroll', onScroll);
}

/* ==========================================================================
   05 / ABOUT & COLOPHON VIEW
   ========================================================================== */
function renderAboutView() {
  appRoot.innerHTML = `
    <section class="liquid-glass liquid-glass-elevated about-card">
      <span class="swiss-kicker">ABOUT // ${SITE_CONFIG.brandName.toUpperCase()}</span>
      <h1 class="art-h1" style="margin-top: 14px;">${SITE_CONFIG.brandName}</h1>
      <p class="art-lead" style="margin-top: 12px;">${SITE_CONFIG.bio}</p>

      <div class="swiss-card" style="margin-top: 24px; max-width: 520px;">
        <div class="swiss-card-head">
          <h2 class="swiss-card-title">SITE SPECIFICATION</h2>
          <span class="swiss-card-code">UTC+8</span>
        </div>
        <div class="rail-meta-grid" style="margin-top: 0;">
          <div class="rail-meta-row"><span>BLOG</span><span class="rail-meta-val">${SITE_CONFIG.brandName}</span></div>
          <div class="rail-meta-row"><span>TIMEZONE</span><span class="rail-meta-val">Asia/Shanghai (UTC+8)</span></div>
          <div class="rail-meta-row"><span>TIME PHASES</span><span class="rail-meta-val">6 (日出→深夜)</span></div>
          <div class="rail-meta-row"><span>SEASONS × WEATHER</span><span class="rail-meta-val">春夏秋冬 × 晴雾雨雪</span></div>
        </div>
      </div>
    </section>
    ${renderFooter()}
  `;
}

/* ==========================================================================
   HASH ROUTER
   ========================================================================== */
function updateActiveNav(routeKey) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.nav === routeKey);
  });
}

function handleRoute() {
  if (scrollCleanup) {
    scrollCleanup();
    scrollCleanup = null;
  }

  atmoPanel.setAttribute('hidden', '');
  atmoToggle.setAttribute('aria-expanded', 'false');

  const raw = window.location.hash || '#/';
  const [path, queryStr] = raw.split('?');
  const params = new URLSearchParams(queryStr || '');

  if (path.startsWith('#/post/')) {
    const slug = path.replace('#/post/', '');
    renderArticleView(slug);
    updateActiveNav('posts');
  } else if (path === '#/posts' || path === '#/archive') {
    renderPostsDirectoryView(params.get('tag') || '');
    updateActiveNav('posts');
  } else if (path === '#/notes') {
    renderNotesView();
    updateActiveNav('notes');
  } else if (path === '#/about') {
    renderAboutView();
    updateActiveNav('about');
  } else {
    renderHomeView();
    updateActiveNav('home');
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  attachGlassSpecularHover();
}

/* ==========================================================================
   BOOT
   ========================================================================== */
function boot() {
  renderAtmosphereControls();

  backdropManager = new BackdropManager(slotA, slotB);
  canvasFX = new ManorCanvasFX(canvasEl, parallaxEl);
  atmosphere = new AtmosphereController((snap) => {
    syncAtmosphereHUD(snap);
    canvasFX.updateState(snap);
    backdropManager.update(snap.season, snap.timePhase);
  });

  atmosphere.start();
  const initialSnap = atmosphere.getSnapshot();
  syncAtmosphereHUD(initialSnap);
  canvasFX.updateState(initialSnap);
  backdropManager.update(initialSnap.season, initialSnap.timePhase);
  canvasFX.start();

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

boot();
