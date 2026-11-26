/**
 * Hidden Admin Console View (#/admin) — Mission Control v2
 * Security Lock Screen + 6 Modules:
 *   01 / 流量与深度分析（时间范围、实时在线、24h 时段、完读率/停留、筛选与单条删除、屏蔽规则）
 *   02 / 文章与可视化写作（文章列表 + 论坛式 Markdown 编辑器 + 拖图压缩上传）
 *   03 / 互动与留言审核（文章评论 & 留言板审核、站长回复、拉黑、点赞榜）
 *   04 / 站点运营与碎碎念（公告栏、碎碎念、NOW、简介、社交链接、友链）
 *   05 / 运维、部署与备份（GitHub Actions 监控、全链路测速、12 幕巡检、全站备份、审计日志）
 *   06 / 密钥与系统配置（云端接口、ADMIN_TOKEN、GitHub PAT）
 */

import { SITE_CONFIG, MICRO_NOTES } from '../data/siteConfig.js';
import { POSTS, ALL_POSTS, getRawMarkdownArticles, getAllTags } from '../data/posts.js';
import {
  getAdminConfig,
  saveAdminConfig,
  isAdminUnlocked,
  setAdminUnlocked,
  verifyAdminToken,
  fetchAnalyticsStats,
  deleteVisitLogs,
  clearCloudStats,
  updateServerSettings,
  fetchAdminComments,
  moderateAdminComment,
  deleteAdminComment,
  fetchAuditLogs,
  isOwnerIgnored,
  setOwnerIgnored
} from '../engine/analytics.js';
import {
  generateSiteConfigSource,
  publishSiteConfigToGitHub,
  fetchGitHubWorkflowRuns
} from '../engine/githubCms.js';
import { escapeHtml } from '../engine/markdown.js';
import { BACKDROP_EXT } from '../engine/backdropManager.js';
import { SEASONS } from '../engine/atmosphere.js';
import { renderArticlesManagerTab } from './adminEditor.js';

function topEntries(obj, limit = 6) {
  return Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

const COUNTRY_NAMES = {
  CN: '中国',
  HK: '中国香港',
  TW: '中国台湾',
  MO: '中国澳门',
  US: '美国',
  JP: '日本',
  SG: '新加坡',
  KR: '韩国',
  GB: '英国',
  DE: '德国',
  CA: '加拿大',
  AU: '澳大利亚',
  FR: '法国'
};

function formatRouteLabel(rawPath = '/') {
  const clean = String(rawPath || '/').split('?')[0];
  if (clean === '/' || clean === '') return `首页 · ${SITE_CONFIG.brandName}`;
  if (clean === '/posts' || clean === '/archive') return '全部文章目录';
  if (clean === '/notes') return '碎碎念时间轴';
  if (clean === '/about') return '关于博客 & 留言板';
  if (clean.startsWith('/post/')) {
    const slug = clean.replace('/post/', '');
    const post = ALL_POSTS.find((p) => p.slug === slug);
    if (post) return `文章 · ${post.shortTitle || post.title}`;
  }
  return clean;
}

function formatCommentTarget(target = '') {
  if (target === 'guestbook') return '站点留言板';
  if (target.startsWith('post:')) {
    const slug = target.slice(5);
    const post = ALL_POSTS.find((p) => p.slug === slug);
    return post ? `文章 · ${post.shortTitle || post.title}` : `文章 · ${slug}`;
  }
  return target || '未知位置';
}

function formatReferrerLabel(rawRef = '直接访问') {
  const ref = String(rawRef || '直接访问').toLowerCase();
  if (ref === '直接访问') return '直接访问';
  if (ref.includes('weixin') || ref.includes('wechat')) return '微信分享';
  if (ref.includes('qq.com')) return 'QQ / 腾讯系';
  if (ref.includes('github.com')) return 'GitHub';
  if (ref.includes('google.')) return 'Google 搜索';
  if (ref.includes('bing.com')) return 'Bing 搜索';
  if (ref.includes('baidu.com')) return '百度搜索';
  if (ref.includes('t.co') || ref.includes('x.com') || ref.includes('twitter.com')) return 'X / Twitter';
  if (ref.includes('zhihu.com')) return '知乎';
  if (ref.includes('bilibili.com')) return 'Bilibili';
  if (ref.includes('v2ex.com')) return 'V2EX';
  return rawRef;
}

function formatRegionLabel(rawRegion = '') {
  const str = String(rawRegion || '未知');
  const m = str.match(/^([A-Z]{2})\s*·\s*(.+)$/);
  if (m && COUNTRY_NAMES[m[1]]) return `${COUNTRY_NAMES[m[1]]} · ${m[2]}`;
  if (COUNTRY_NAMES[str]) return COUNTRY_NAMES[str];
  return str;
}

function formatDuration(sec = 0) {
  if (!sec || sec < 1) return '--';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function formatIsoToBeijing(iso = '') {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const cst = new Date(d.getTime() + 8 * 3600 * 1000);
  return cst.toISOString().replace('T', ' ').slice(0, 19);
}

export function renderAdminConsole(rootEl, { atmosphere, renderFooter }) {
  const draftConfig = JSON.parse(JSON.stringify(SITE_CONFIG));
  if (!draftConfig.announcement) {
    draftConfig.announcement = { enabled: false, text: '', href: '', linkLabel: '', tone: 'tech' };
  }
  if (!Array.isArray(draftConfig.links)) draftConfig.links = [];
  if (!Array.isArray(draftConfig.friendLinks)) draftConfig.friendLinks = [];
  if (!Array.isArray(draftConfig.nowList)) draftConfig.nowList = [];
  if (!draftConfig.postOverrides) draftConfig.postOverrides = {};

  const draftNotes = JSON.parse(JSON.stringify(MICRO_NOTES));
  const draftArticles = getRawMarkdownArticles();

  let activeTab = 'telemetry';
  let activeRange = '7d';
  let latestStats = null;
  let autoRefresh = true;
  let pollTimer = null;
  let destroyed = false;

  // Log filters state
  let logFilterQuery = '';
  let logFilterRegion = '';
  let logFilterRef = '';
  const selectedLogIds = new Set();

  // Comments filter state
  let commentFilter = 'all';

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    if (!autoRefresh || destroyed || activeTab !== 'telemetry' || !isAdminUnlocked()) return;
    pollTimer = setInterval(() => {
      if (!document.hidden && !destroyed && activeTab === 'telemetry') {
        renderTelemetryTab({ silent: true });
      }
    }, 30000);
  };

  const onVisibilityChange = () => {
    if (!document.hidden && autoRefresh && !destroyed && activeTab === 'telemetry' && isAdminUnlocked()) {
      renderTelemetryTab({ silent: true });
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* ========================================================================
     SECURITY LOCK SCREEN (BEFORE SHOWING ADMIN SHELL)
     ======================================================================== */
  function renderLockScreen() {
    stopPolling();
    const cfg = getAdminConfig();
    rootEl.innerHTML = `
      <div class="admin-lock-wrap">
        <section class="liquid-glass liquid-glass-elevated admin-lock-card">
          <span class="swiss-kicker">SECURITY GATE // 管理员身份验证</span>
          <h1 class="art-h1" style="margin: 12px 0 8px; font-size: var(--fs-xl);">${escapeHtml(SITE_CONFIG.brandName)} · 后台解锁</h1>
          <p class="admin-sub" style="margin-bottom: 18px;">
            请输入 Cloudflare Worker 的管理员密码（<code>ADMIN_TOKEN</code>）以解锁管理后台。验证状态仅保留在当前浏览器会话中。
          </p>

          <form id="admin-lock-form" class="admin-form">
            <label class="admin-field">
              <span>云端统计接口地址</span>
              <input type="url" id="lock-worker-url" class="swiss-search" value="${escapeHtml(cfg.workerUrl)}" placeholder="https://stat.blog.gavinli.top" />
            </label>
            <label class="admin-field">
              <span>管理员密码（ADMIN_TOKEN）</span>
              <input type="password" id="lock-admin-token" class="swiss-search" value="${escapeHtml(cfg.adminToken)}" placeholder="输入管理员密码…" autofocus />
            </label>
            <div id="lock-feedback"></div>
            <div class="admin-btn-row" style="margin-top: 6px; justify-content: space-between;">
              <a href="#/" class="status-action-btn" style="text-decoration: none;">← 返回博客前台</a>
              <div class="admin-btn-row">
                ${
                  !cfg.workerUrl
                    ? '<button type="button" class="status-action-btn" id="btn-local-unlock">本地离线预览</button>'
                    : ''
                }
                <button type="submit" class="featured-cta" id="btn-verify-unlock" style="border: none; cursor: pointer;">验证并进入后台 →</button>
              </div>
            </div>
          </form>
        </section>
      </div>
      ${renderFooter()}
    `;

    const form = document.getElementById('admin-lock-form');
    const fb = document.getElementById('lock-feedback');
    const btn = document.getElementById('btn-verify-unlock');

    document.getElementById('btn-local-unlock')?.addEventListener('click', () => {
      setAdminUnlocked(true);
      renderShell();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const workerUrl = document.getElementById('lock-worker-url').value.trim().replace(/\/+$/, '');
      const adminToken = document.getElementById('lock-admin-token').value.trim();

      if (!workerUrl) {
        setAdminUnlocked(true);
        renderShell();
        return;
      }

      btn.disabled = true;
      btn.textContent = '正在向云端验证…';
      fb.innerHTML = '';

      try {
        await verifyAdminToken(workerUrl, adminToken);
        saveAdminConfig({ workerUrl, adminToken });
        setAdminUnlocked(true);
        renderShell();
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;"><strong>验证未通过：</strong>${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '验证并进入后台 →';
      }
    });
  }

  /* ========================================================================
     MAIN ADMIN SHELL (6 TABS)
     ======================================================================== */
  let bodyEl = null;
  let tabsEl = null;
  let modeBadgeEl = null;
  let pendingBadgeEl = null;

  function renderShell() {
    rootEl.innerHTML = `
      <div class="admin-shell">
        <section class="liquid-glass liquid-glass-elevated admin-header-card">
          <div class="admin-top-bar">
            <div>
              <span class="swiss-kicker">ADMIN CONSOLE // PRIVATE MISSION CONTROL</span>
              <h1 class="art-h1" style="margin: 10px 0 4px; font-size: var(--fs-xl);">${escapeHtml(SITE_CONFIG.brandName)} · 管理控制台</h1>
              <p class="admin-sub">隐藏入口（<code>#/admin</code> · 快捷键 <code>Ctrl+Shift+A</code>）— 深度流量分析、可视化写作、留言审核、站点运营与运维监控。</p>
            </div>
            <div class="admin-head-actions">
              <span class="swiss-tag" id="admin-mode-badge">初始化中…</span>
              <button type="button" class="status-action-btn" id="btn-lock-admin" title="锁定后台并清除当前会话解锁状态">🔒 锁定</button>
              <a href="#/" class="status-action-btn" style="text-decoration: none;">← 返回前台</a>
            </div>
          </div>

          <div class="admin-tabs" id="admin-tabs" role="tablist">
            <button type="button" class="admin-tab is-active" data-tab="telemetry">
              <span class="nav-idx">01</span>流量分析
            </button>
            <button type="button" class="admin-tab" data-tab="articles">
              <span class="nav-idx">02</span>文章与写作
            </button>
            <button type="button" class="admin-tab" data-tab="interactions">
              <span class="nav-idx">03</span>留言与互动 <span class="tab-pill-badge" id="pending-cmt-badge" hidden>0</span>
            </button>
            <button type="button" class="admin-tab" data-tab="operations">
              <span class="nav-idx">04</span>运营与碎碎念
            </button>
            <button type="button" class="admin-tab" data-tab="devops">
              <span class="nav-idx">05</span>运维与备份
            </button>
            <button type="button" class="admin-tab" data-tab="settings">
              <span class="nav-idx">06</span>系统配置
            </button>
          </div>
        </section>

        <div id="admin-tab-body" class="admin-tab-body"></div>
        ${renderFooter()}
      </div>
    `;

    bodyEl = document.getElementById('admin-tab-body');
    tabsEl = document.getElementById('admin-tabs');
    modeBadgeEl = document.getElementById('admin-mode-badge');
    pendingBadgeEl = document.getElementById('pending-cmt-badge');

    document.getElementById('btn-lock-admin')?.addEventListener('click', () => {
      setAdminUnlocked(false);
      renderLockScreen();
    });

    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) switchTab(btn.dataset.tab);
    });

    switchTab(activeTab);
  }

  const switchTab = (tabId) => {
    activeTab = tabId;
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.tab === tabId);
    });
    stopPolling();
    if (tabId === 'telemetry') {
      renderTelemetryTab({ silent: false });
      startPolling();
    } else if (tabId === 'articles') {
      renderArticlesManagerTab(bodyEl, {
        atmosphere,
        draftArticles,
        draftConfig,
        draftNotes,
        latestStats,
        onNeedSettings: () => switchTab('settings')
      });
    } else if (tabId === 'interactions') {
      renderInteractionsTab();
    } else if (tabId === 'operations') {
      renderOperationsTab();
    } else if (tabId === 'devops') {
      renderDevOpsTab();
    } else if (tabId === 'settings') {
      renderSettingsTab();
    }
  };

  /* ========================================================================
     TAB 01: ADVANCED VISITOR TELEMETRY & READING DEPTH
     ======================================================================== */
  async function renderTelemetryTab({ silent = false } = {}) {
    if (!silent) {
      bodyEl.innerHTML = `
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <p class="empty-state">正在读取全网访客与阅读深度数据…</p>
        </section>
      `;
    }

    try {
      const stats = await fetchAnalyticsStats(activeRange);
      if (destroyed || activeTab !== 'telemetry') return;
      latestStats = stats;

      const isCloud = stats.mode === 'cloud';
      const ignoredSelf = isOwnerIgnored();
      const updatedTime = atmosphere.getSnapshot().clockFull;
      modeBadgeEl.textContent = isCloud ? '云端全网统计 · LIVE' : '本机预览模式 · LOCAL';
      modeBadgeEl.className = `swiss-tag ${isCloud ? 'swiss-tag-tech' : 'swiss-tag-accent'}`;

      if (pendingBadgeEl) {
        if (stats.pendingComments > 0) {
          pendingBadgeEl.textContent = String(stats.pendingComments);
          pendingBadgeEl.hidden = false;
        } else {
          pendingBadgeEl.hidden = true;
        }
      }

      const topPages = topEntries(stats.pages, 6).map(([k, v]) => [formatRouteLabel(k), v, k]);
      const topRegions = topEntries(stats.countries, 6).map(([k, v]) => [formatRegionLabel(k), v, k]);
      const topDevices = topEntries(stats.devices, 6).map(([k, v]) => [k, v, k]);
      const topRefs = topEntries(stats.referrers, 5).map(([k, v]) => [formatReferrerLabel(k), v, k]);
      const maxDaily = Math.max(1, ...stats.dailySeries.map((d) => d.pv));
      const hourly = Array.isArray(stats.hourlySeries) && stats.hourlySeries.length === 24
        ? stats.hourlySeries
        : Array(24).fill(0);
      const maxHourly = Math.max(1, ...hourly);
      const hottestLabel = topPages[0]?.[0] || `首页 · ${SITE_CONFIG.brandName}`;

      // Filter recent logs
      const allRegions = Array.from(new Set((stats.recent || []).map((r) => formatRegionLabel(r.region || '—'))));
      const allRefs = Array.from(new Set((stats.recent || []).map((r) => formatReferrerLabel(r.referrer || '直接访问'))));
      const q = logFilterQuery.trim().toLowerCase();
      const filteredLogs = (stats.recent || []).filter((r) => {
        const regLabel = formatRegionLabel(r.region || '—');
        const refLabel = formatReferrerLabel(r.referrer || '直接访问');
        const routeLabel = formatRouteLabel(r.path || '/');
        if (logFilterRegion && regLabel !== logFilterRegion) return false;
        if (logFilterRef && refLabel !== logFilterRef) return false;
        if (q) {
          const hay = `${r.path} ${routeLabel} ${regLabel} ${refLabel} ${r.device} ${r.visitorId}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const engagementEntries = Object.entries(stats.engagement || {}).sort(
        (a, b) => (b[1].sessions || 0) - (a[1].sessions || 0)
      );
      const srvSettings = stats.settings || { ignorePaths: ['/__diag'], ignoreUas: [] };
      const rangeLabelMap = { today: '今日', '7d': '近 7 日', '30d': '近 30 日', all: '累计全部' };

      bodyEl.innerHTML = `
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">TELEMETRY // 深度流量分析 · 更新于 ${updatedTime} CST</span>
              <h2 class="panel-title" style="margin-top: 6px;">${isCloud ? '全网访客与阅读深度看板' : '本机访问记录概览'}</h2>
            </div>
            <div class="admin-btn-row">
              <div class="range-pills" id="range-pills">
                ${['today', '7d', '30d', 'all']
                  .map(
                    (rk) => `
                  <button type="button" class="status-action-btn ${activeRange === rk ? 'is-tech-active' : ''}" data-range="${rk}">
                    ${rangeLabelMap[rk]}
                  </button>
                `
                  )
                  .join('')}
              </div>
              <button type="button" class="status-action-btn ${autoRefresh ? 'is-tech-active' : ''}" id="btn-toggle-poll">
                ${autoRefresh ? '● 自动刷新 30s' : '○ 自动刷新：关'}
              </button>
              <button type="button" class="status-action-btn ${ignoredSelf ? 'is-tech-active' : ''}" id="btn-toggle-ignore-self">
                ${ignoredSelf ? '✓ 本机不计入' : '忽略本机'}
              </button>
              <button type="button" class="status-action-btn" id="btn-refresh-stats">立即刷新</button>
              <button type="button" class="status-action-btn is-danger" id="btn-clear-stats">清空全部</button>
            </div>
          </div>

          <!-- 5-Col KPI Strip -->
          <div class="admin-kpi-grid is-5col">
            <div class="admin-kpi">
              <span class="admin-kpi-label">${activeRange === 'all' ? 'TOTAL PV' : `${rangeLabelMap[activeRange]} PV`}</span>
              <div class="admin-kpi-val">${stats.rangePv ?? stats.totalPv}</div>
              <span class="admin-kpi-sub">累计总 PV：${stats.totalPv}</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">${activeRange === 'all' ? 'TOTAL UV' : `${rangeLabelMap[activeRange]} UV`}</span>
              <div class="admin-kpi-val">${stats.rangeUv ?? stats.totalUv}</div>
              <span class="admin-kpi-sub">累计独立访客：${stats.totalUv}</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">TODAY (UTC+8)</span>
              <div class="admin-kpi-val">${stats.todayPv}</div>
              <span class="admin-kpi-sub">今日独立访客 · ${stats.todayUv} UV</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">LIVE ONLINE (5 MIN)</span>
              <div class="admin-kpi-val" style="color: var(--accent-tech);">${stats.onlineCount ?? 0}</div>
              <span class="admin-kpi-sub">最近 5 分钟活跃在线</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">TOP CONTENT</span>
              <div class="admin-kpi-val" style="font-size: var(--fs-sm); line-height: 1.4;" title="${escapeHtml(hottestLabel)}">${escapeHtml(hottestLabel)}</div>
              <span class="admin-kpi-sub">最受欢迎内容</span>
            </div>
          </div>

          <!-- Daily Trend + 24h Hourly Heatmap -->
          <div class="admin-charts-row">
            <div class="admin-subblock" style="margin-top: 0;">
              <div class="admin-subblock-head">
                <h3>${activeRange === '30d' ? '近 30 日' : activeRange === 'today' ? '今日' : '近 7 日'}访问趋势（北京时间）</h3>
                <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">PV / UV</span>
              </div>
              <div class="trend-chart ${stats.dailySeries.length > 10 ? 'is-dense' : ''}" style="grid-template-columns: repeat(${stats.dailySeries.length}, minmax(0, 1fr));">
                ${stats.dailySeries
                  .map((d, idx) => {
                    const pct = Math.max(4, Math.round((d.pv / maxDaily) * 100));
                    const showLabel = stats.dailySeries.length <= 10 || idx % 5 === 0 || idx === stats.dailySeries.length - 1;
                    return `
                      <div class="trend-col" title="${d.fullDay}: ${d.pv} PV / ${d.uv} UV">
                        <span class="trend-val">${stats.dailySeries.length <= 10 || d.pv > 0 ? d.pv : ''}</span>
                        <div class="trend-bar-wrap">
                          <div class="trend-bar" style="height: ${d.pv === 0 ? 4 : pct}%;"></div>
                        </div>
                        <span class="trend-day">${showLabel ? d.day : ''}</span>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <div class="admin-subblock" style="margin-top: 0;">
              <div class="admin-subblock-head">
                <h3>24 小时活跃时段分布（UTC+8）</h3>
                <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">00:00 – 23:00</span>
              </div>
              <div class="hourly-chart">
                ${hourly
                  .map((val, hr) => {
                    const pct = val === 0 ? 4 : Math.max(8, Math.round((val / maxHourly) * 100));
                    return `
                      <div class="hourly-col" title="${String(hr).padStart(2, '0')}:00 – ${String(hr).padStart(2, '0')}:59 · ${val} 次访问">
                        <div class="hourly-bar-wrap">
                          <div class="hourly-bar" style="height: ${pct}%;"></div>
                        </div>
                        <span class="hourly-label">${hr % 4 === 0 ? String(hr).padStart(2, '0') : ''}</span>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>

          <!-- 3-Column Distribution Breakdown -->
          <div class="admin-dist-grid">
            <div class="swiss-card">
              <div class="swiss-card-head">
                <h4 class="swiss-card-title">热门内容</h4>
                <span class="swiss-card-code">CONTENT</span>
              </div>
              ${renderRankList(topPages, stats.totalPv)}
            </div>

            <div class="swiss-card">
              <div class="swiss-card-head">
                <h4 class="swiss-card-title">地区分布</h4>
                <span class="swiss-card-code">GEO</span>
              </div>
              ${renderRankList(topRegions, stats.totalPv)}
            </div>

            <div class="swiss-card">
              <div class="swiss-card-head">
                <h4 class="swiss-card-title">设备与来源</h4>
                <span class="swiss-card-code">CLIENT</span>
              </div>
              ${renderRankList(topDevices, stats.totalPv)}
              <div class="rail-divider"></div>
              <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute); margin-bottom: 8px;">REFERRERS</div>
              ${renderRankList(topRefs, stats.totalPv)}
            </div>
          </div>

          <!-- Reading Depth & Dwell Time -->
          <div class="admin-subblock">
            <div class="admin-subblock-head">
              <h3>文章阅读深度与停留时长</h3>
              <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">SCROLL >= 80% 计为完读</span>
            </div>
            ${
              engagementEntries.length
                ? `<div class="tier-table-wrap" style="margin-top: 10px;">
                    <table class="swiss-table">
                      <thead>
                        <tr>
                          <th>阅读内容</th>
                          <th>有效阅读次</th>
                          <th>平均停留时长</th>
                          <th>平均滚动深度</th>
                          <th>完读率 (≥80%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${engagementEntries
                          .map(([path, e]) => {
                            const avgSec = e.sessions ? e.totalDwellSec / e.sessions : 0;
                            const avgScroll = e.sessions ? Math.round(e.totalScroll / e.sessions) : 0;
                            const comp = e.sessions ? Math.round((e.completed / e.sessions) * 100) : 0;
                            return `
                              <tr>
                                <td>${escapeHtml(formatRouteLabel(path))}</td>
                                <td class="swiss-mono">${e.sessions}</td>
                                <td class="swiss-mono">${formatDuration(avgSec)}</td>
                                <td class="swiss-mono">${avgScroll}%</td>
                                <td class="swiss-mono" style="color: var(--accent-tech); font-weight: 600;">${comp}%</td>
                              </tr>
                            `;
                          })
                          .join('')}
                      </tbody>
                    </table>
                  </div>`
                : '<p class="mini-note-text" style="color: var(--ink-mute); margin-top: 10px;">暂无完读深度数据。读者打开文章阅读超过 2 秒后离开时会自动上报（需更新 Cloudflare Worker 后生效）。</p>'
            }
          </div>

          <!-- Recent Visit Logs with Filters & Single/Batch Delete -->
          <div class="admin-subblock">
            <div class="admin-subblock-head" style="flex-wrap: wrap; gap: 10px;">
              <h3 id="logs-count-heading">访客明细流水（筛选命中 ${filteredLogs.length} / ${(stats.recent || []).length} 条）</h3>
              <div class="admin-btn-row">
                <button type="button" class="status-action-btn is-danger" id="btn-delete-selected" ${selectedLogIds.size ? '' : 'disabled'}>
                  删除选中 (${selectedLogIds.size})
                </button>
              </div>
            </div>

            <div class="log-filter-bar">
              <input type="search" id="log-filter-q" class="swiss-search" placeholder="搜索文章名、路径、访客ID、设备…" value="${escapeHtml(logFilterQuery)}" />
              <select id="log-filter-region" class="swiss-search" style="max-width: 210px;">
                <option value="">全部地区</option>
                ${allRegions.map((rg) => `<option value="${escapeHtml(rg)}" ${logFilterRegion === rg ? 'selected' : ''}>${escapeHtml(rg)}</option>`).join('')}
              </select>
              <select id="log-filter-ref" class="swiss-search" style="max-width: 190px;">
                <option value="">全部来源</option>
                ${allRefs.map((rf) => `<option value="${escapeHtml(rf)}" ${logFilterRef === rf ? 'selected' : ''}>${escapeHtml(rf)}</option>`).join('')}
              </select>
            </div>

            <div id="logs-op-feedback" style="margin-top: 8px;"></div>
            <div id="logs-table-wrap"></div>
          </div>

          <!-- Server-side Ignore Rules -->
          <div class="admin-subblock">
            <div class="swiss-card">
              <div class="swiss-card-head">
                <h4 class="swiss-card-title">服务端屏蔽规则（过滤测试路径与特定爬虫）</h4>
                <span class="swiss-card-code">FILTER RULES</span>
              </div>
              <form id="ignore-rules-form" class="admin-form" style="margin-top: 8px;">
                <div class="admin-form-row">
                  <label class="admin-field">
                    <span>忽略的路径前缀（英文逗号分隔）</span>
                    <input type="text" id="rule-ignore-paths" class="swiss-search" value="${escapeHtml((srvSettings.ignorePaths || []).join(', '))}" placeholder="如 /__diag, /test" />
                  </label>
                  <label class="admin-field">
                    <span>屏蔽的 User-Agent 关键词（英文逗号分隔）</span>
                    <input type="text" id="rule-ignore-uas" class="swiss-search" value="${escapeHtml((srvSettings.ignoreUas || []).join(', '))}" placeholder="如 curl, python-requests" />
                  </label>
                  <div class="admin-field" style="flex: 0 0 auto;">
                    <button type="submit" class="status-action-btn is-tech-active">保存屏蔽规则</button>
                  </div>
                </div>
                <div id="rules-feedback"></div>
              </form>
            </div>
          </div>
        </section>
      `;

      // Bind telemetry events
      bodyEl.querySelector('#range-pills')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-range]');
        if (b) {
          activeRange = b.dataset.range;
          renderTelemetryTab({ silent: false });
        }
      });

      document.getElementById('btn-toggle-poll')?.addEventListener('click', () => {
        autoRefresh = !autoRefresh;
        if (autoRefresh) startPolling();
        else stopPolling();
        renderTelemetryTab({ silent: true });
      });

      document.getElementById('btn-toggle-ignore-self')?.addEventListener('click', () => {
        setOwnerIgnored(!isOwnerIgnored());
        renderTelemetryTab({ silent: true });
      });

      document.getElementById('btn-refresh-stats')?.addEventListener('click', () => renderTelemetryTab({ silent: false }));

      document.getElementById('btn-clear-stats')?.addEventListener('click', async () => {
        if (!window.confirm('确认清空全部统计记录？此操作不可撤销。')) return;
        await clearCloudStats();
        selectedLogIds.clear();
        renderTelemetryTab();
      });

      const syncSelectedBtn = () => {
        const delBtn = document.getElementById('btn-delete-selected');
        if (delBtn) {
          delBtn.textContent = `删除选中 (${selectedLogIds.size})`;
          delBtn.disabled = selectedLogIds.size === 0;
        }
      };

      const runDeleteIds = async (ids) => {
        const fb = document.getElementById('logs-op-feedback');
        try {
          await deleteVisitLogs(ids);
          ids.forEach((id) => selectedLogIds.delete(id));
          renderTelemetryTab({ silent: true });
        } catch (err) {
          if (fb) fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">${escapeHtml(err.message)}</div>`;
        }
      };

      const renderFilteredLogsTable = () => {
        const wrap = document.getElementById('logs-table-wrap');
        const head = document.getElementById('logs-count-heading');
        if (!wrap) return;
        const kw = logFilterQuery.trim().toLowerCase();
        const rows = (stats.recent || []).filter((r) => {
          const regLabel = formatRegionLabel(r.region || '—');
          const refLabel = formatReferrerLabel(r.referrer || '直接访问');
          const routeLabel = formatRouteLabel(r.path || '/');
          if (logFilterRegion && regLabel !== logFilterRegion) return false;
          if (logFilterRef && refLabel !== logFilterRef) return false;
          if (kw) {
            const hay = `${r.path} ${routeLabel} ${regLabel} ${refLabel} ${r.device} ${r.visitorId}`.toLowerCase();
            if (!hay.includes(kw)) return false;
          }
          return true;
        });

        if (head) head.textContent = `访客明细流水（筛选命中 ${rows.length} / ${(stats.recent || []).length} 条）`;
        if (!rows.length) {
          wrap.innerHTML = '<p class="empty-state">当前筛选条件下没有匹配记录。</p>';
          return;
        }

        wrap.innerHTML = `
          <div class="tier-table-wrap" style="margin-top: 10px;">
            <table class="swiss-table admin-log-table">
              <thead>
                <tr>
                  <th style="width: 34px;"><input type="checkbox" id="log-select-all" aria-label="全选" /></th>
                  <th>北京时间</th>
                  <th>访客 ID</th>
                  <th>地区</th>
                  <th>访问内容</th>
                  <th>设备 / 浏览器</th>
                  <th>来源</th>
                  <th style="width: 54px;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .slice(0, 80)
                  .map(
                    (r) => `
                  <tr>
                    <td><input type="checkbox" class="log-row-check" data-log-id="${escapeHtml(r.id)}" ${selectedLogIds.has(r.id) ? 'checked' : ''} /></td>
                    <td class="swiss-mono" style="font-size: var(--fs-xs); white-space: nowrap;">${escapeHtml(r.ts)}</td>
                    <td class="swiss-mono" style="font-size: var(--fs-xs); color: var(--accent);">#${escapeHtml(r.visitorId || '—')}</td>
                    <td style="white-space: nowrap;">${escapeHtml(formatRegionLabel(r.region || '—'))}</td>
                    <td title="${escapeHtml(r.path || '/')}">${escapeHtml(formatRouteLabel(r.path || '/'))}</td>
                    <td style="font-size: var(--fs-sm);">${escapeHtml(r.device || '—')}</td>
                    <td style="font-size: var(--fs-sm); color: var(--ink-mute); white-space: nowrap;" title="${escapeHtml(r.referrer || '直接访问')}">${escapeHtml(formatReferrerLabel(r.referrer || '直接访问'))}</td>
                    <td>
                      <button type="button" class="log-del-btn" data-del-one-log="${escapeHtml(r.id)}" title="删除此条记录">×</button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;

        wrap.querySelector('#log-select-all')?.addEventListener('change', (e) => {
          const checked = e.target.checked;
          wrap.querySelectorAll('.log-row-check').forEach((cb) => {
            cb.checked = checked;
            if (checked) selectedLogIds.add(cb.dataset.logId);
            else selectedLogIds.delete(cb.dataset.logId);
          });
          syncSelectedBtn();
        });

        wrap.querySelectorAll('.log-row-check').forEach((cb) => {
          cb.addEventListener('change', () => {
            if (cb.checked) selectedLogIds.add(cb.dataset.logId);
            else selectedLogIds.delete(cb.dataset.logId);
            syncSelectedBtn();
          });
        });

        wrap.querySelectorAll('[data-del-one-log]').forEach((btn) => {
          btn.addEventListener('click', () => runDeleteIds([btn.dataset.delOneLog]));
        });
      };

      renderFilteredLogsTable();

      document.getElementById('log-filter-q')?.addEventListener('input', (e) => {
        logFilterQuery = e.target.value;
        renderFilteredLogsTable();
      });
      document.getElementById('log-filter-region')?.addEventListener('change', (e) => {
        logFilterRegion = e.target.value;
        renderFilteredLogsTable();
      });
      document.getElementById('log-filter-ref')?.addEventListener('change', (e) => {
        logFilterRef = e.target.value;
        renderFilteredLogsTable();
      });

      document.getElementById('btn-delete-selected')?.addEventListener('click', () => {
        if (!selectedLogIds.size) return;
        if (!window.confirm(`确认删除选中的 ${selectedLogIds.size} 条访客记录？`)) return;
        runDeleteIds(Array.from(selectedLogIds));
      });

      document.getElementById('ignore-rules-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fb = document.getElementById('rules-feedback');
        const ignorePaths = document.getElementById('rule-ignore-paths').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        const ignoreUas = document.getElementById('rule-ignore-uas').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        try {
          await updateServerSettings({ ignorePaths, ignoreUas });
          fb.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">屏蔽规则已保存到 Cloudflare Worker！</div>';
        } catch (err) {
          fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">${escapeHtml(err.message)}</div>`;
        }
      });
    } catch (err) {
      modeBadgeEl.textContent = '连接失败 · ERROR';
      modeBadgeEl.className = 'swiss-tag swiss-tag-accent';
      bodyEl.innerHTML = `
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="swiss-callout is-warn">
            <strong>读取云端统计失败：</strong>${escapeHtml(err.message)}。请检查接口地址或管理员密码。
          </div>
          <div class="admin-btn-row">
            <button type="button" class="status-action-btn" id="btn-retry-stats">重试</button>
            <button type="button" class="status-action-btn" id="btn-fix-cfg">检查系统配置</button>
          </div>
        </section>
      `;
      document.getElementById('btn-retry-stats')?.addEventListener('click', () => renderTelemetryTab());
      document.getElementById('btn-fix-cfg')?.addEventListener('click', () => switchTab('settings'));
    }
  }

  function renderRankList(entries, total) {
    if (!entries.length) {
      return '<p class="mini-note-text" style="color: var(--ink-mute);">暂无数据</p>';
    }
    return `
      <div class="rank-list">
        ${entries
          .map(([label, count, raw]) => {
            const pct = total ? Math.round((count / total) * 100) : 0;
            const tooltip = raw && raw !== label ? `${label} (${raw})` : label;
            return `
              <div class="rank-row">
                <div class="rank-top">
                  <span class="rank-name" title="${escapeHtml(tooltip)}">${escapeHtml(label)}</span>
                  <span class="rank-num">${count} <small>(${pct}%)</small></span>
                </div>
                <div class="rank-bar-bg"><div class="rank-bar-fg" style="width: ${pct}%;"></div></div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /* ========================================================================
     TAB 03: READER INTERACTIONS (COMMENTS, GUESTBOOK & LIKES MODERATION)
     ======================================================================== */
  async function renderInteractionsTab() {
    bodyEl.innerHTML = `
      <section class="liquid-glass liquid-glass-elevated admin-panel">
        <p class="empty-state">正在加载全站评论、留言与点赞数据…</p>
      </section>
    `;

    try {
      const data = await fetchAdminComments();
      const comments = data.comments || [];
      const settings = data.settings || { commentModeration: 'auto', bannedVisitors: [] };
      const pendingCount = comments.filter((c) => c.status === 'pending').length;

      if (pendingBadgeEl) {
        pendingBadgeEl.textContent = String(pendingCount);
        pendingBadgeEl.hidden = pendingCount === 0;
      }

      const filtered = comments.filter((c) => {
        if (commentFilter === 'pending') return c.status === 'pending';
        if (commentFilter === 'approved') return c.status === 'approved';
        if (commentFilter === 'hidden') return c.status === 'hidden';
        if (commentFilter === 'guestbook') return c.target === 'guestbook';
        if (commentFilter === 'posts') return c.target.startsWith('post:');
        return true;
      });

      const likesObj = latestStats?.likes || {};
      const likesRank = topEntries(likesObj, 10).map(([slug, count]) => {
        const post = ALL_POSTS.find((p) => p.slug === slug);
        return [post ? post.shortTitle || post.title : slug, count, slug];
      });
      const totalLikes = Object.values(likesObj).reduce((s, n) => s + Number(n || 0), 0);

      bodyEl.innerHTML = `
        <div class="admin-pub-grid" style="grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.85fr);">
          <!-- Left: Comments & Guestbook Queue -->
          <section class="liquid-glass liquid-glass-elevated admin-panel">
            <div class="admin-panel-head">
              <div>
                <span class="swiss-kicker">MODERATION // 文章评论与站点留言板</span>
                <h2 class="panel-title" style="margin-top: 6px;">留言审核台（${comments.length} 条 · 待审 ${pendingCount}）</h2>
              </div>
              <div class="admin-btn-row">
                <button type="button" class="status-action-btn ${settings.commentModeration === 'auto' ? 'is-tech-active' : ''}" id="btn-mod-auto">自动公开</button>
                <button type="button" class="status-action-btn ${settings.commentModeration === 'manual' ? 'is-tech-active' : ''}" id="btn-mod-manual">先审后发</button>
                <button type="button" class="status-action-btn" id="btn-refresh-cmt">刷新</button>
              </div>
            </div>

            <div class="filter-bar" id="cmt-filter-bar" style="margin-top: 14px;">
              ${[
                ['all', `全部 (${comments.length})`],
                ['pending', `待审核 (${pendingCount})`],
                ['approved', '已公开'],
                ['hidden', '已隐藏'],
                ['posts', '文章评论'],
                ['guestbook', '留言板']
              ]
                .map(
                  ([k, label]) => `
                <button type="button" class="filter-pill ${commentFilter === k ? 'is-active' : ''}" data-cmt-filter="${k}">${label}</button>
              `
                )
                .join('')}
            </div>

            <div id="cmt-admin-feedback" style="margin-top: 10px;"></div>

            <div class="admin-cmt-list">
              ${
                filtered.length
                  ? filtered
                      .map((c) => {
                        const badge =
                          c.status === 'pending'
                            ? '<span class="swiss-tag swiss-tag-accent">待审核</span>'
                            : c.status === 'hidden'
                              ? '<span class="swiss-tag">已隐藏</span>'
                              : '<span class="swiss-tag swiss-tag-tech">已公开</span>';
                        return `
                          <article class="admin-cmt-card">
                            <div class="admin-cmt-head">
                              <div class="admin-cmt-meta">
                                ${badge}
                                <strong>${escapeHtml(c.author)}</strong>
                                ${c.email ? `<span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">${escapeHtml(c.email)}</span>` : ''}
                                <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">· ${escapeHtml(formatRegionLabel(c.region || ''))} · #${escapeHtml(c.visitorId || '')}</span>
                              </div>
                              <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">${escapeHtml(c.ts || '')}</span>
                            </div>
                            <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--accent-tech); margin: 4px 0 8px;">
                              位置：${escapeHtml(formatCommentTarget(c.target))}
                            </div>
                            <p class="mini-note-text" style="margin: 0 0 10px;">${escapeHtml(c.content).replace(/\n/g, '<br />')}</p>
                            ${
                              c.ownerReply
                                ? `<div class="comment-owner-reply" style="margin-bottom: 10px;">
                                    <span class="swiss-tag swiss-tag-tech">站长已回复</span>
                                    <div style="margin-top: 4px; font-size: var(--fs-sm);">${escapeHtml(c.ownerReply)}</div>
                                  </div>`
                                : ''
                            }
                            <div class="admin-btn-row" style="gap: 6px;">
                              ${c.status !== 'approved' ? `<button type="button" class="status-action-btn is-tech-active" data-cmt-approve="${escapeHtml(c.id)}">通过公开</button>` : ''}
                              ${c.status !== 'hidden' ? `<button type="button" class="status-action-btn" data-cmt-hide="${escapeHtml(c.id)}">隐藏</button>` : ''}
                              <button type="button" class="status-action-btn" data-cmt-reply="${escapeHtml(c.id)}">${c.ownerReply ? '修改回复' : '站长回复'}</button>
                              ${!c.isOwner && c.visitorId ? `<button type="button" class="status-action-btn is-danger" data-cmt-ban="${escapeHtml(c.id)}">拉黑访客</button>` : ''}
                              <button type="button" class="status-action-btn is-danger" data-cmt-del="${escapeHtml(c.id)}">删除</button>
                            </div>
                          </article>
                        `;
                      })
                      .join('')
                  : '<p class="empty-state">当前分类下暂无评论或留言。</p>'
              }
            </div>
          </section>

          <!-- Right: Likes Leaderboard & Banned Visitors -->
          <div style="display: grid; gap: 20px;">
            <section class="liquid-glass liquid-glass-elevated admin-panel">
              <div class="admin-panel-head">
                <div>
                  <span class="swiss-kicker">LIKES // 读者点赞榜</span>
                  <h2 class="panel-title" style="margin-top: 6px;">累计收获 ♥ ${totalLikes}</h2>
                </div>
              </div>
              <div style="margin-top: 14px;">
                ${renderRankList(likesRank, Math.max(1, totalLikes))}
              </div>
            </section>

            <section class="liquid-glass liquid-glass-elevated admin-panel">
              <div class="admin-panel-head">
                <div>
                  <span class="swiss-kicker">BLACKLIST // 禁言黑名单</span>
                  <h2 class="panel-title" style="margin-top: 6px;">已拉黑访客 (${(settings.bannedVisitors || []).length})</h2>
                </div>
              </div>
              <div class="draft-list" style="margin-top: 12px;">
                ${
                  (settings.bannedVisitors || []).length
                    ? settings.bannedVisitors
                        .map(
                          (vid) => `
                        <div class="draft-item">
                          <span class="swiss-mono">#${escapeHtml(vid)}</span>
                          <button type="button" class="status-action-btn" data-unban-vid="${escapeHtml(vid)}">解除拉黑</button>
                        </div>
                      `
                        )
                        .join('')
                    : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无拉黑访客。</p>'
                }
              </div>
            </section>
          </div>
        </div>
      `;

      const fb = document.getElementById('cmt-admin-feedback');
      bodyEl.querySelector('#cmt-filter-bar')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cmt-filter]');
        if (b) {
          commentFilter = b.dataset.cmtFilter;
          renderInteractionsTab();
        }
      });

      document.getElementById('btn-refresh-cmt')?.addEventListener('click', () => renderInteractionsTab());

      const setModMode = async (mode) => {
        try {
          await updateServerSettings({ commentModeration: mode });
          renderInteractionsTab();
        } catch (err) {
          fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">${escapeHtml(err.message)}</div>`;
        }
      };
      document.getElementById('btn-mod-auto')?.addEventListener('click', () => setModMode('auto'));
      document.getElementById('btn-mod-manual')?.addEventListener('click', () => setModMode('manual'));

      bodyEl.querySelectorAll('[data-cmt-approve]').forEach((b) => {
        b.addEventListener('click', async () => {
          await moderateAdminComment({ id: b.dataset.cmtApprove, status: 'approved' });
          renderInteractionsTab();
        });
      });

      bodyEl.querySelectorAll('[data-cmt-hide]').forEach((b) => {
        b.addEventListener('click', async () => {
          await moderateAdminComment({ id: b.dataset.cmtHide, status: 'hidden' });
          renderInteractionsTab();
        });
      });

      bodyEl.querySelectorAll('[data-cmt-reply]').forEach((b) => {
        b.addEventListener('click', async () => {
          const cur = comments.find((x) => x.id === b.dataset.cmtReply);
          const reply = window.prompt('输入站长回复内容（留空则清除回复）：', cur?.ownerReply || '');
          if (reply === null) return;
          await moderateAdminComment({ id: b.dataset.cmtReply, ownerReply: reply, status: 'approved' });
          renderInteractionsTab();
        });
      });

      bodyEl.querySelectorAll('[data-cmt-ban]').forEach((b) => {
        b.addEventListener('click', async () => {
          if (!window.confirm('确认隐藏该留言并拉黑此访客？拉黑后该访客无法再次发言。')) return;
          await moderateAdminComment({ id: b.dataset.cmtBan, banVisitor: true });
          renderInteractionsTab();
        });
      });

      bodyEl.querySelectorAll('[data-cmt-del]').forEach((b) => {
        b.addEventListener('click', async () => {
          if (!window.confirm('确认永久删除该留言？')) return;
          await deleteAdminComment(b.dataset.cmtDel);
          renderInteractionsTab();
        });
      });

      bodyEl.querySelectorAll('[data-unban-vid]').forEach((b) => {
        b.addEventListener('click', async () => {
          const nextBanned = (settings.bannedVisitors || []).filter((v) => v !== b.dataset.unbanVid);
          await updateServerSettings({ bannedVisitors: nextBanned });
          renderInteractionsTab();
        });
      });
    } catch (err) {
      bodyEl.innerHTML = `
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="swiss-callout is-warn">
            <strong>加载评论审核台失败：</strong>${escapeHtml(err.message)}。
          </div>
          <p class="mini-note-text" style="color: var(--ink-mute);">
            若提示 404 Not found，请把仓库最新版的 <code>worker/analytics-worker.js</code> 粘贴并重新 Deploy 到 Cloudflare Workers 即可启用点赞与留言系统。
          </p>
        </section>
      `;
    }
  }

  /* ========================================================================
     TAB 04: SITE OPERATIONS (ANNOUNCEMENT, MICRO-NOTES, NOW, SOCIAL & FRIENDS)
     ======================================================================== */
  function renderOperationsTab() {
    const snap = atmosphere.getSnapshot();
    const hasGithub = Boolean(getAdminConfig().githubToken);
    const ann = draftConfig.announcement;

    bodyEl.innerHTML = `
      <div style="display: grid; gap: 20px;">
        <!-- Top Full-Width Announcement Bar Manager -->
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">ANNOUNCEMENT // 全站公告栏</span>
              <h2 class="panel-title" style="margin-top: 6px;">首页顶部公告横幅开关</h2>
            </div>
            <label class="editor-checkbox">
              <input type="checkbox" id="ann-enabled" ${ann.enabled ? 'checked' : ''} />
              <span>启用前台公告栏</span>
            </label>
          </div>

          <div class="editor-meta-grid" style="margin-top: 14px;">
            <label class="admin-field" style="grid-column: span 2;">
              <span>公告文案</span>
              <input type="text" id="ann-text" class="swiss-search" value="${escapeHtml(ann.text)}" placeholder="例如：博客已开放留言板与文章评论，欢迎交流！" />
            </label>
            <label class="admin-field">
              <span>公告色调</span>
              <select id="ann-tone" class="swiss-search">
                <option value="tech" ${ann.tone === 'tech' ? 'selected' : ''}>青绿提示（推荐）</option>
                <option value="warn" ${ann.tone === 'warn' ? 'selected' : ''}>暖红醒目</option>
                <option value="note" ${ann.tone === 'note' ? 'selected' : ''}>钴蓝通知</option>
              </select>
            </label>
            <label class="admin-field">
              <span>跳转链接（可选）</span>
              <input type="text" id="ann-href" class="swiss-search" value="${escapeHtml(ann.href)}" placeholder="如 #/about 或 https://..." />
            </label>
            <label class="admin-field">
              <span>链接按钮文字（可选）</span>
              <input type="text" id="ann-link-label" class="swiss-search" value="${escapeHtml(ann.linkLabel)}" placeholder="查看详情 →" />
            </label>
          </div>
        </section>

        <div class="admin-pub-grid">
          <!-- Left: Micro-Notes Composer -->
          <section class="liquid-glass liquid-glass-elevated admin-panel">
            <div class="admin-panel-head">
              <div>
                <span class="swiss-kicker">MICRO-NOTES // 快捷发碎碎念</span>
                <h2 class="panel-title" style="margin-top: 6px;">记录此刻灵感</h2>
              </div>
              <span class="swiss-tag">${snap.dateStr} · ${snap.phaseMeta.label}</span>
            </div>

            <form id="note-compose-form" class="admin-form">
              <label class="admin-field">
                <span>碎碎念正文</span>
                <textarea id="note-input-text" rows="4" class="admin-textarea" placeholder="随手写一段想法、折腾心得或此刻窗外的风景…"></textarea>
              </label>
              <div class="admin-form-row">
                <label class="admin-field">
                  <span>气象 / 心情标签</span>
                  <input id="note-input-mood" type="text" class="swiss-search" value="${snap.seasonMeta.label} · ${snap.weatherMeta.label}" />
                </label>
                <div class="admin-field" style="justify-content: flex-end;">
                  <button type="submit" class="featured-cta" style="border: none; cursor: pointer; justify-content: center;">+ 加入待发布列表</button>
                </div>
              </div>
            </form>

            <div class="rail-divider"></div>
            <div class="admin-subblock-head">
              <h3>当前碎碎念列表（${draftNotes.length} 条）</h3>
            </div>
            <div class="draft-list">
              ${
                draftNotes.length
                  ? draftNotes
                      .map(
                        (n, idx) => `
                    <div class="draft-item">
                      <div>
                        <div class="mini-note-meta">${escapeHtml(n.date)} · ${escapeHtml(n.time)} · ${escapeHtml(n.phase)} · ${escapeHtml(n.mood)}</div>
                        <p class="mini-note-text">${escapeHtml(n.content)}</p>
                      </div>
                      <button type="button" class="status-action-btn is-danger" data-del-note="${idx}">删除</button>
                    </div>
                  `
                      )
                      .join('')
                  : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无碎碎念。</p>'
              }
            </div>
          </section>

          <!-- Right: Bio, NOW, Social Links & Friend Links -->
          <section class="liquid-glass liquid-glass-elevated admin-panel">
            <div class="admin-panel-head">
              <div>
                <span class="swiss-kicker">PROFILE & LINKS // 简介、近况与外链</span>
                <h2 class="panel-title" style="margin-top: 6px;">站点资料管理</h2>
              </div>
            </div>

            <div class="admin-form">
              <label class="admin-field">
                <span>博客一句话简介</span>
                <input id="cfg-bio-input" type="text" class="swiss-search" value="${escapeHtml(draftConfig.bio)}" />
              </label>
            </div>

            <div class="rail-divider"></div>
            <div class="admin-subblock-head"><h3>此刻在做（NOW · ${draftConfig.nowList.length}）</h3></div>
            <form id="now-add-form" class="admin-form-row" style="margin-top: 10px;">
              <input id="now-tag-input" type="text" class="swiss-search" placeholder="标签如 BUILD" style="max-width: 118px;" />
              <input id="now-text-input" type="text" class="swiss-search" placeholder="正在做的事情…" />
              <button type="submit" class="status-action-btn">添加</button>
            </form>
            <div class="draft-list">
              ${
                draftConfig.nowList.length
                  ? draftConfig.nowList
                      .map(
                        (item, idx) => `
                    <div class="draft-item">
                      <div><span class="swiss-tag">${escapeHtml(item.tag)}</span> <span style="margin-left: 6px; font-size: var(--fs-sm);">${escapeHtml(item.text)}</span></div>
                      <button type="button" class="status-action-btn is-danger" data-del-now="${idx}">移除</button>
                    </div>
                  `
                      )
                      .join('')
                  : '<p class="mini-note-text" style="color: var(--ink-mute);">当前为空。</p>'
              }
            </div>

            <div class="rail-divider"></div>
            <div class="admin-subblock-head"><h3>社交与联系链接（${draftConfig.links.length}）</h3></div>
            <form id="social-add-form" class="admin-form-row" style="margin-top: 10px;">
              <input id="social-label-input" type="text" class="swiss-search" placeholder="名称如 Email / GitHub" style="max-width: 140px;" />
              <input id="social-href-input" type="text" class="swiss-search" placeholder="mailto:xxx 或 https://..." />
              <button type="submit" class="status-action-btn">添加</button>
            </form>
            <div class="draft-list">
              ${
                draftConfig.links.length
                  ? draftConfig.links
                      .map(
                        (l, idx) => `
                    <div class="draft-item">
                      <div style="min-width: 0; overflow: hidden;">
                        <strong>${escapeHtml(l.label)}</strong>
                        <span class="swiss-mono" style="margin-left: 8px; font-size: var(--fs-xs); color: var(--ink-mute);">${escapeHtml(l.href)}</span>
                      </div>
                      <button type="button" class="status-action-btn is-danger" data-del-social="${idx}">移除</button>
                    </div>
                  `
                      )
                      .join('')
                  : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无社交链接。</p>'
              }
            </div>

            <div class="rail-divider"></div>
            <div class="admin-subblock-head"><h3>友情链接（${draftConfig.friendLinks.length}）</h3></div>
            <form id="friend-add-form" class="admin-form" style="margin-top: 10px; gap: 8px;">
              <div class="admin-form-row">
                <input id="friend-name-input" type="text" class="swiss-search" placeholder="站点名称" />
                <input id="friend-href-input" type="url" class="swiss-search" placeholder="https://example.com" />
              </div>
              <div class="admin-form-row">
                <input id="friend-desc-input" type="text" class="swiss-search" placeholder="一句话介绍（可选）" />
                <button type="submit" class="status-action-btn" style="flex: 0 0 auto;">+ 添加友链</button>
              </div>
            </form>
            <div class="draft-list">
              ${
                draftConfig.friendLinks.length
                  ? draftConfig.friendLinks
                      .map(
                        (f, idx) => `
                    <div class="draft-item">
                      <div>
                        <strong>${escapeHtml(f.name)}</strong>
                        <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">${escapeHtml(f.href)}${f.desc ? ` · ${escapeHtml(f.desc)}` : ''}</div>
                      </div>
                      <button type="button" class="status-action-btn is-danger" data-del-friend="${idx}">移除</button>
                    </div>
                  `
                      )
                      .join('')
                  : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无友情链接。</p>'
              }
            </div>

            <div class="rail-divider"></div>
            <div id="publish-feedback"></div>
            <div class="admin-btn-row" style="margin-top: 10px;">
              <button type="button" class="featured-cta" id="btn-push-github" style="border: none; cursor: pointer;">
                ${hasGithub ? '一键推送运营配置上线 →' : '推送到 GitHub（需先配 Token）'}
              </button>
              <button type="button" class="status-action-btn" id="btn-copy-siteconfig">复制 siteConfig.js</button>
            </div>
          </section>
        </div>
      </div>
    `;

    // Announcement bindings
    document.getElementById('ann-enabled')?.addEventListener('change', (e) => {
      draftConfig.announcement.enabled = e.target.checked;
    });
    document.getElementById('ann-text')?.addEventListener('input', (e) => {
      draftConfig.announcement.text = e.target.value;
    });
    document.getElementById('ann-tone')?.addEventListener('change', (e) => {
      draftConfig.announcement.tone = e.target.value;
    });
    document.getElementById('ann-href')?.addEventListener('input', (e) => {
      draftConfig.announcement.href = e.target.value.trim();
    });
    document.getElementById('ann-link-label')?.addEventListener('input', (e) => {
      draftConfig.announcement.linkLabel = e.target.value.trim();
    });

    document.getElementById('cfg-bio-input')?.addEventListener('input', (e) => {
      draftConfig.bio = e.target.value;
    });

    document.getElementById('note-compose-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = document.getElementById('note-input-text').value.trim();
      const mood = document.getElementById('note-input-mood').value.trim();
      if (!content) return;
      const nowSnap = atmosphere.getSnapshot();
      draftNotes.unshift({
        id: `n-${Date.now().toString(36)}`,
        date: nowSnap.dateStr,
        time: `${nowSnap.clockShort} CST`,
        phase: nowSnap.phaseMeta.label,
        mood: mood || `${nowSnap.seasonMeta.label} · ${nowSnap.weatherMeta.label}`,
        content
      });
      renderOperationsTab();
    });

    bodyEl.querySelectorAll('[data-del-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftNotes.splice(Number(btn.dataset.delNote), 1);
        renderOperationsTab();
      });
    });

    document.getElementById('now-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tag = (document.getElementById('now-tag-input').value.trim() || 'NOW').toUpperCase();
      const text = document.getElementById('now-text-input').value.trim();
      if (!text) return;
      draftConfig.nowList.push({ tag, text });
      renderOperationsTab();
    });

    bodyEl.querySelectorAll('[data-del-now]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftConfig.nowList.splice(Number(btn.dataset.delNow), 1);
        renderOperationsTab();
      });
    });

    document.getElementById('social-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = document.getElementById('social-label-input').value.trim();
      const href = document.getElementById('social-href-input').value.trim();
      if (!label || !href) return;
      draftConfig.links.push({ label, href });
      renderOperationsTab();
    });

    bodyEl.querySelectorAll('[data-del-social]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftConfig.links.splice(Number(btn.dataset.delSocial), 1);
        renderOperationsTab();
      });
    });

    document.getElementById('friend-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('friend-name-input').value.trim();
      const href = document.getElementById('friend-href-input').value.trim();
      const desc = document.getElementById('friend-desc-input').value.trim();
      if (!name || !href) return;
      draftConfig.friendLinks.push({ name, href, desc });
      renderOperationsTab();
    });

    bodyEl.querySelectorAll('[data-del-friend]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftConfig.friendLinks.splice(Number(btn.dataset.delFriend), 1);
        renderOperationsTab();
      });
    });

    document.getElementById('btn-copy-siteconfig')?.addEventListener('click', async () => {
      const code = generateSiteConfigSource(draftConfig, draftNotes);
      await navigator.clipboard.writeText(code);
      document.getElementById('publish-feedback').innerHTML =
        '<div class="swiss-callout is-tech" style="margin: 0 0 10px;">已复制完整 <code>siteConfig.js</code> 代码到剪贴板！</div>';
    });

    document.getElementById('btn-push-github')?.addEventListener('click', async () => {
      const fb = document.getElementById('publish-feedback');
      if (!getAdminConfig().githubToken) {
        switchTab('settings');
        return;
      }
      const btn = document.getElementById('btn-push-github');
      btn.disabled = true;
      btn.textContent = '正在推送至 GitHub…';
      try {
        const res = await publishSiteConfigToGitHub(
          draftConfig,
          draftNotes,
          `content(admin): update operations/announcement/notes (${atmosphere.getSnapshot().dateStr})`
        );
        fb.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0 0 10px;"><strong>推送成功！</strong>提交 <code>${escapeHtml(res.sha)}</code> 已触发自动构建，约 30 秒后生效（<a href="${escapeHtml(res.url)}" target="_blank" rel="noopener noreferrer">查看提交</a>）。</div>`;
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0 0 10px;"><strong>推送失败：</strong>${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '一键推送运营配置上线 →';
      }
    });
  }

  /* ========================================================================
     TAB 05: DEVOPS, DEPLOYMENTS, ENDPOINT PING, 12 SCENES, BACKUP & AUDIT
     ======================================================================== */
  async function renderDevOpsTab() {
    const snap = atmosphere.getSnapshot();
    const tags = getAllTags();
    const keys = [
      { id: 'day', label: '白天', phase: 'morning' },
      { id: 'golden', label: '晨昏', phase: 'sunset' },
      { id: 'night', label: '深夜', phase: 'night' }
    ];

    bodyEl.innerHTML = `
      <div style="display: grid; gap: 20px;">
        <!-- Row 1: GitHub Actions + Endpoint Latency -->
        <div class="admin-pub-grid">
          <section class="liquid-glass liquid-glass-elevated admin-panel">
            <div class="admin-panel-head">
              <div>
                <span class="swiss-kicker">CI/CD // GITHUB ACTIONS</span>
                <h2 class="panel-title" style="margin-top: 6px;">最近构建部署记录</h2>
              </div>
              <button type="button" class="status-action-btn" id="btn-refresh-runs">刷新状态</button>
            </div>
            <div id="gh-runs-box" style="margin-top: 14px;">
              <p class="empty-state" style="padding: 14px 0;">正在拉取 GitHub Actions 运行记录…</p>
            </div>
          </section>

          <section class="liquid-glass liquid-glass-elevated admin-panel">
            <div class="admin-panel-head">
              <div>
                <span class="swiss-kicker">PROBE // 全链路健康与延迟</span>
                <h2 class="panel-title" style="margin-top: 6px;">节点连通性体检</h2>
              </div>
              <div class="admin-btn-row">
                <button type="button" class="status-action-btn" id="btn-reping-all">重新测速</button>
                <button type="button" class="status-action-btn is-tech-active" id="btn-full-backup">⬇ 一键全站备份</button>
              </div>
            </div>
            <div id="endpoint-probe-list" class="draft-list" style="margin-top: 14px;"></div>
            <div id="backup-feedback" style="margin-top: 10px;"></div>
          </section>
        </div>

        <!-- Row 2: Audit Log -->
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">AUDIT // 安全与操作审计</span>
              <h2 class="panel-title" style="margin-top: 6px;">最近管理操作日志</h2>
            </div>
          </div>
          <div id="audit-log-box" style="margin-top: 12px;">
            <p class="empty-state" style="padding: 12px 0;">正在读取操作日志…</p>
          </div>
        </section>

        <!-- Row 3: 12-Scene Backdrop Inspector -->
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">HEALTH // 12 幕庄园原画巡检</span>
              <h2 class="panel-title" style="margin-top: 6px;">背景资源与站点概览</h2>
            </div>
            <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">
              ${POSTS.length} 篇文章 · ${tags.length} 标签 · ${MICRO_NOTES.length} 碎碎念 · ${snap.clockShort} CST
            </span>
          </div>

          <div class="backdrop-matrix" style="margin-top: 16px;">
            ${SEASONS.map((s) =>
              keys
                .map((k) => {
                  const file = `manor-${s.id}-${k.id}.${BACKDROP_EXT}`;
                  return `
                    <div class="backdrop-check-card" data-probe-file="./assets/${file}">
                      <div class="backdrop-check-top">
                        <strong>${s.label} · ${k.label}</strong>
                        <span class="swiss-tag" data-probe-status>检测中…</span>
                      </div>
                      <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute); margin: 4px 0 10px;">${file}</div>
                      <div class="backdrop-check-foot">
                        <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);" data-probe-dim>-- × --</span>
                        <button type="button" class="status-action-btn" data-preview-season="${s.id}" data-preview-phase="${k.phase}">实时预览</button>
                      </div>
                    </div>
                  `;
                })
                .join('')
            ).join('')}
          </div>
        </section>
      </div>
    `;

    // 1. Load GitHub Actions runs
    const loadRuns = async () => {
      const box = document.getElementById('gh-runs-box');
      if (!box) return;
      box.innerHTML = '<p class="empty-state" style="padding: 14px 0;">正在拉取构建状态…</p>';
      try {
        const runs = await fetchGitHubWorkflowRuns(6);
        if (!runs.length) {
          box.innerHTML = '<p class="empty-state">暂无 Actions 运行记录。</p>';
          return;
        }
        box.innerHTML = `<div class="draft-list">${runs
          .map((r) => {
            const isRunning = r.status !== 'completed';
            const badgeCls = isRunning
              ? 'swiss-tag'
              : r.conclusion === 'success'
                ? 'swiss-tag swiss-tag-tech'
                : 'swiss-tag swiss-tag-accent';
            const badgeText = isRunning
              ? '构建中…'
              : r.conclusion === 'success'
                ? '成功'
                : r.conclusion || '异常';
            return `
              <div class="draft-item">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="${badgeCls}">${badgeText}</span>
                    <strong style="font-size: var(--fs-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.message || r.name)}</strong>
                  </div>
                  <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute); margin-top: 4px;">
                    ${escapeHtml(r.sha)} · ${escapeHtml(r.branch)} · ${escapeHtml(formatIsoToBeijing(r.createdAt))} CST
                  </div>
                </div>
                <a class="status-action-btn" style="text-decoration: none;" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">详情 ↗</a>
              </div>
            `;
          })
          .join('')}</div>`;
      } catch (err) {
        box.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">读取失败：${escapeHtml(err.message)}</div>`;
      }
    };
    loadRuns();
    document.getElementById('btn-refresh-runs')?.addEventListener('click', loadRuns);

    // 2. Endpoint Latency Probe
    const runEndpointProbes = async () => {
      const list = document.getElementById('endpoint-probe-list');
      if (!list) return;
      const targets = [
        { name: '博客主站（GitHub Pages）', url: 'https://blog.gavinli.top/', mode: 'no-cors' },
        { name: '统计代理（Vercel Edge）', url: 'https://stat.blog.gavinli.top/health', mode: 'cors' },
        { name: '统计源站（Cloudflare Worker）', url: 'https://blog-analytics.traplijun.workers.dev/health', mode: 'cors' },
        { name: 'GitHub REST API', url: 'https://api.github.com/zen', mode: 'cors' }
      ];

      list.innerHTML = targets
        .map(
          (t, i) => `
        <div class="draft-item" id="probe-row-${i}">
          <div>
            <strong style="font-size: var(--fs-sm);">${t.name}</strong>
            <div class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">${t.url}</div>
          </div>
          <span class="swiss-tag" data-probe-ms>测速中…</span>
        </div>
      `
        )
        .join('');

      await Promise.all(
        targets.map(async (t, i) => {
          const badge = document.querySelector(`#probe-row-${i} [data-probe-ms]`);
          const t0 = performance.now();
          try {
            const res = await fetch(t.url, { mode: t.mode, cache: 'no-store' });
            const ms = Math.round(performance.now() - t0);
            const ok = t.mode === 'no-cors' || res.ok;
            badge.textContent = ok ? `${res.status || 'OK'} · ${ms}ms` : `HTTP ${res.status} · ${ms}ms`;
            badge.className = `swiss-tag ${ok ? 'swiss-tag-tech' : 'swiss-tag-accent'}`;
          } catch {
            const ms = Math.round(performance.now() - t0);
            badge.textContent = `超时/拦截 · ${ms}ms`;
            badge.className = 'swiss-tag swiss-tag-accent';
          }
        })
      );
    };
    runEndpointProbes();
    document.getElementById('btn-reping-all')?.addEventListener('click', runEndpointProbes);

    // 3. One-click Full Backup
    document.getElementById('btn-full-backup')?.addEventListener('click', async () => {
      const fb = document.getElementById('backup-feedback');
      fb.innerHTML = '<div class="swiss-callout" style="margin: 0;">正在打包全站数据…</div>';
      try {
        const [statsSnap, commentsSnap, auditSnap] = await Promise.all([
          fetchAnalyticsStats('30d').catch(() => latestStats || {}),
          fetchAdminComments().catch(() => ({ comments: [] })),
          fetchAuditLogs().catch(() => [])
        ]);
        const bundle = {
          exportedAt: atmosphere.getSnapshot().dateStr + ' ' + atmosphere.getSnapshot().clockFull + ' CST',
          siteConfig: draftConfig,
          microNotes: draftNotes,
          markdownArticles: draftArticles,
          analytics: statsSnap,
          comments: commentsSnap.comments || [],
          auditLogs: auditSnap
        };
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gavins-blog-full-backup-${atmosphere.getSnapshot().dateStr}.json`;
        a.click();
        fb.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">全站数据备份包已生成并开始下载！</div>';
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">备份失败：${escapeHtml(err.message)}</div>`;
      }
    });

    // 4. Load Audit Logs
    fetchAuditLogs().then((logs) => {
      const box = document.getElementById('audit-log-box');
      if (!box) return;
      if (!logs.length) {
        box.innerHTML = '<p class="mini-note-text" style="color: var(--ink-mute);">暂无管理操作审计记录。</p>';
        return;
      }
      box.innerHTML = `
        <div class="tier-table-wrap">
          <table class="swiss-table">
            <thead><tr><th>北京时间</th><th>操作类型</th><th>详情</th></tr></thead>
            <tbody>
              ${logs
                .slice(0, 20)
                .map(
                  (l) => `
                <tr>
                  <td class="swiss-mono" style="font-size: var(--fs-xs); white-space: nowrap;">${escapeHtml(l.ts)}</td>
                  <td><span class="swiss-tag">${escapeHtml(l.action)}</span></td>
                  <td style="font-size: var(--fs-sm);">${escapeHtml(l.detail || '—')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    // 5. Probe 12 Backdrop Images
    bodyEl.querySelectorAll('[data-probe-file]').forEach((card) => {
      const src = card.dataset.probeFile;
      const statusEl = card.querySelector('[data-probe-status]');
      const dimEl = card.querySelector('[data-probe-dim]');
      const img = new Image();
      img.onload = () => {
        statusEl.textContent = '200 OK';
        statusEl.classList.add('swiss-tag-tech');
        dimEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      };
      img.onerror = () => {
        statusEl.textContent = '缺失';
        statusEl.classList.add('swiss-tag-accent');
        dimEl.textContent = '未找到文件';
      };
      img.src = src;
    });

    bodyEl.querySelectorAll('[data-preview-season]').forEach((btn) => {
      btn.addEventListener('click', () => {
        atmosphere.setSeason(btn.dataset.previewSeason);
        atmosphere.setTimePhase(btn.dataset.previewPhase);
      });
    });
  }

  /* ========================================================================
     TAB 06: SYSTEM & CREDENTIALS SETTINGS
     ======================================================================== */
  function renderSettingsTab() {
    const cfg = getAdminConfig();
    bodyEl.innerHTML = `
      <div class="admin-pub-grid">
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">SETTINGS // 密钥与接口配置</span>
              <h2 class="panel-title" style="margin-top: 6px;">连接云端接口与 GitHub 发布</h2>
            </div>
          </div>

          <div class="swiss-callout is-tech" style="margin-top: 14px;">
            <strong>隐私与安全承诺：</strong>下方填写的管理员密码与 GitHub Token <strong>仅保存在你当前浏览器的本地存储中</strong>，绝不会提交到公开代码仓库。
          </div>

          <form id="admin-settings-form" class="admin-form">
            <label class="admin-field">
              <span>云端统计与互动接口地址（推荐用国内直连代理域名）</span>
              <input id="set-worker-url" type="url" class="swiss-search" placeholder="https://stat.blog.gavinli.top" value="${escapeHtml(cfg.workerUrl)}" />
            </label>

            <label class="admin-field">
              <span>Worker 管理员密码（ADMIN_TOKEN）</span>
              <input id="set-admin-token" type="password" class="swiss-search" placeholder="与 Cloudflare Worker Secret 一致" value="${escapeHtml(cfg.adminToken)}" />
            </label>

            <div class="rail-divider"></div>

            <label class="admin-field">
              <span>GitHub Fine-grained Token（用于浏览器写文章、传图、发碎碎念）</span>
              <input id="set-github-token" type="password" class="swiss-search" placeholder="github_pat_...（单仓库 Contents: Read and write）" value="${escapeHtml(cfg.githubToken)}" />
            </label>

            <div class="admin-form-row">
              <label class="admin-field">
                <span>GitHub 用户名</span>
                <input id="set-gh-owner" type="text" class="swiss-search" value="${escapeHtml(cfg.githubOwner)}" />
              </label>
              <label class="admin-field">
                <span>博客仓库名</span>
                <input id="set-gh-repo" type="text" class="swiss-search" value="${escapeHtml(cfg.githubRepo)}" />
              </label>
            </div>

            <div id="settings-feedback"></div>

            <div class="admin-btn-row" style="margin-top: 6px;">
              <button type="submit" class="featured-cta" style="border: none; cursor: pointer;">保存配置到本机浏览器</button>
              <button type="button" class="status-action-btn" id="btn-sync-endpoint">把统计地址写入线上站点</button>
            </div>
          </form>
        </section>

        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">UPGRADE GUIDE // 后端升级提示</span>
              <h2 class="panel-title" style="margin-top: 6px;">启用全部 v2 互动与深度分析</h2>
            </div>
          </div>

          <ol class="step-list" style="margin-top: 16px;">
            <li>
              <span class="step-badge">01</span>
              <span><strong>更新 Cloudflare Worker：</strong>将仓库最新版的 <code>worker/analytics-worker.js</code> 全选粘贴到 Cloudflare Workers（<code>blog-analytics</code>）并点击 <strong>Deploy</strong>，即可启用点赞、评论/留言板、完读率、单条日志删除与操作审计。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span><strong>配置 GitHub Token（可选）：</strong>在 GitHub Settings → Developer settings → Fine-grained tokens 勾选仅 <code>Gaviniar.github.io</code> 的 <code>Contents: Read and write</code>，粘贴到左侧即可直接在浏览器写文章、上传压缩图片、改公告与发碎碎念。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span><strong>安全锁屏：</strong>每次打开新浏览器窗口访问 <code>#/admin</code> 都会先经过 <code>ADMIN_TOKEN</code> 校验；点击右上角「🔒 锁定」可随时立即上锁。</span>
            </li>
          </ol>
        </section>
      </div>
    `;

    const form = document.getElementById('admin-settings-form');
    const fb = document.getElementById('settings-feedback');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAdminConfig({
        workerUrl: document.getElementById('set-worker-url').value,
        adminToken: document.getElementById('set-admin-token').value.trim(),
        githubToken: document.getElementById('set-github-token').value.trim(),
        githubOwner: document.getElementById('set-gh-owner').value.trim() || 'Gaviniar',
        githubRepo: document.getElementById('set-gh-repo').value.trim() || 'Gaviniar.github.io'
      });
      fb.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">配置已保存到本机浏览器！</div>';
    });

    document.getElementById('btn-sync-endpoint')?.addEventListener('click', async () => {
      const workerUrl = document.getElementById('set-worker-url').value.trim().replace(/\/+$/, '');
      if (!workerUrl) {
        fb.innerHTML = '<div class="swiss-callout is-warn" style="margin: 0;">请先填写统计接口地址。</div>';
        return;
      }
      saveAdminConfig({
        workerUrl,
        adminToken: document.getElementById('set-admin-token').value.trim(),
        githubToken: document.getElementById('set-github-token').value.trim()
      });
      draftConfig.analyticsEndpoint = workerUrl;
      try {
        const res = await publishSiteConfigToGitHub(
          draftConfig,
          draftNotes,
          'chore(admin): sync analytics endpoint to siteConfig'
        );
        fb.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0;"><strong>已同步至线上仓库！</strong>提交 <code>${escapeHtml(res.sha)}</code>。</div>`;
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;"><strong>同步失败：</strong>${escapeHtml(err.message)}</div>`;
      }
    });
  }

  // Boot into Lock Screen or Shell
  const initialCfg = getAdminConfig();
  if (!isAdminUnlocked() && initialCfg.workerUrl) {
    renderLockScreen();
  } else {
    setAdminUnlocked(true);
    renderShell();
  }

  return () => {
    destroyed = true;
    stopPolling();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
