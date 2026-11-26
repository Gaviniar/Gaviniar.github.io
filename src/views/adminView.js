/**
 * Hidden Admin Console View (#/admin)
 * Liquid Glass × Swiss Grid Mission Control:
 *   01 / Visitor Telemetry & Real-time Access Logs (Cloudflare Worker + Local fallback)
 *   02 / Quick Publisher (Micro-Notes, NOW list, Bio/Links → One-click GitHub Auto-Deploy)
 *   03 / 12-Scene Backdrop Inspector & Site Health
 *   04 / Backend & GitHub Token Configuration (stored strictly in local browser storage)
 */

import { SITE_CONFIG, MICRO_NOTES } from '../data/siteConfig.js';
import { POSTS, getAllTags } from '../data/posts.js';
import {
  getAdminConfig,
  saveAdminConfig,
  fetchAnalyticsStats,
  clearCloudStats
} from '../engine/analytics.js';
import {
  generateSiteConfigSource,
  publishSiteConfigToGitHub
} from '../engine/githubCms.js';
import { BACKDROP_EXT } from '../engine/backdropManager.js';
import { SEASONS } from '../engine/atmosphere.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function topEntries(obj, limit = 6) {
  return Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function renderAdminConsole(rootEl, { atmosphere, renderFooter }) {
  // Mutable draft copies for Tab 02 CMS
  const draftConfig = JSON.parse(JSON.stringify(SITE_CONFIG));
  const draftNotes = JSON.parse(JSON.stringify(MICRO_NOTES));
  let activeTab = 'telemetry';
  let latestStats = null;

  rootEl.innerHTML = `
    <div class="admin-shell">
      <section class="liquid-glass liquid-glass-elevated admin-header-card">
        <div class="admin-top-bar">
          <div>
            <span class="swiss-kicker">ADMIN CONSOLE // PRIVATE MISSION CONTROL</span>
            <h1 class="art-h1" style="margin: 10px 0 4px; font-size: clamp(26px, 3.2vw, 38px);">${escapeHtml(SITE_CONFIG.brandName)} · 管理后台</h1>
            <p class="admin-sub">隐藏入口（<code>#/admin</code> · 快捷键 <code>Ctrl+Shift+A</code>）— 访客监控、快捷发布与 12 幕庄园巡检。</p>
          </div>
          <div class="admin-head-actions">
            <span class="swiss-tag" id="admin-mode-badge">初始化中…</span>
            <a href="#/" class="status-action-btn" style="text-decoration: none;">← 返回前台</a>
          </div>
        </div>

        <div class="admin-tabs" id="admin-tabs" role="tablist">
          <button type="button" class="admin-tab is-active" data-tab="telemetry">
            <span class="nav-idx">01</span>访客与流量记录
          </button>
          <button type="button" class="admin-tab" data-tab="publish">
            <span class="nav-idx">02</span>快捷发布台
          </button>
          <button type="button" class="admin-tab" data-tab="health">
            <span class="nav-idx">03</span>12 幕背景与体检
          </button>
          <button type="button" class="admin-tab" data-tab="settings">
            <span class="nav-idx">04</span>云端统计与 GitHub 配置
          </button>
        </div>
      </section>

      <div id="admin-tab-body" class="admin-tab-body"></div>
      ${renderFooter()}
    </div>
  `;

  const bodyEl = document.getElementById('admin-tab-body');
  const tabsEl = document.getElementById('admin-tabs');
  const modeBadgeEl = document.getElementById('admin-mode-badge');

  const switchTab = (tabId) => {
    activeTab = tabId;
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.tab === tabId);
    });
    if (tabId === 'telemetry') renderTelemetryTab();
    else if (tabId === 'publish') renderPublishTab();
    else if (tabId === 'health') renderHealthTab();
    else if (tabId === 'settings') renderSettingsTab();
  };

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchTab(btn.dataset.tab);
  });

  /* ========================================================================
     TAB 01: VISITOR TELEMETRY & ACCESS LOGS
     ======================================================================== */
  async function renderTelemetryTab() {
    bodyEl.innerHTML = `
      <section class="liquid-glass liquid-glass-elevated admin-panel">
        <p class="empty-state">正在读取访客统计数据…</p>
      </section>
    `;

    try {
      const stats = await fetchAnalyticsStats();
      latestStats = stats;

      const isCloud = stats.mode === 'cloud';
      modeBadgeEl.textContent = isCloud ? '云端全网统计 · LIVE' : '本机预览模式 · LOCAL';
      modeBadgeEl.className = `swiss-tag ${isCloud ? 'swiss-tag-tech' : 'swiss-tag-accent'}`;

      const topPages = topEntries(stats.pages, 6);
      const topRegions = topEntries(stats.countries, 6);
      const topDevices = topEntries(stats.devices, 6);
      const topRefs = topEntries(stats.referrers, 5);
      const maxDaily = Math.max(1, ...stats.dailySeries.map((d) => d.pv));
      const hottestPath = topPages[0]?.[0] || '/';

      bodyEl.innerHTML = `
        ${
          !isCloud
            ? `<div class="liquid-glass admin-banner">
                <div>
                  <strong>当前为本机记录模式（仅统计你当前浏览器的访问）：</strong>
                  <span>部署免费的 Cloudflare Worker 后即可查看全网访客的国家/城市、来源、设备与实时访问流水。</span>
                </div>
                <button type="button" class="featured-cta" id="jump-to-setup" style="padding: 8px 16px; border: none; cursor: pointer;">前往 2 分钟配置 →</button>
              </div>`
            : ''
        }

        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">TELEMETRY // 流量总览</span>
              <h2 class="panel-title" style="margin-top: 6px;">${isCloud ? '全网访客实时统计' : '本机访问记录概览'}</h2>
            </div>
            <div class="admin-btn-row">
              <button type="button" class="status-action-btn" id="btn-refresh-stats">刷新数据</button>
              <button type="button" class="status-action-btn" id="btn-export-stats">导出 JSON</button>
              <button type="button" class="status-action-btn is-danger" id="btn-clear-stats">清空记录</button>
            </div>
          </div>

          <div class="admin-kpi-grid">
            <div class="admin-kpi">
              <span class="admin-kpi-label">TOTAL PAGEVIEWS</span>
              <div class="admin-kpi-val">${stats.totalPv}</div>
              <span class="admin-kpi-sub">累计浏览次数 (PV)</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">UNIQUE VISITORS</span>
              <div class="admin-kpi-val">${stats.totalUv}</div>
              <span class="admin-kpi-sub">独立访客数 (UV)</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">TODAY (UTC+8)</span>
              <div class="admin-kpi-val">${stats.todayPv}</div>
              <span class="admin-kpi-sub">今日访问 · ${stats.todayUv} UV</span>
            </div>
            <div class="admin-kpi">
              <span class="admin-kpi-label">TOP ROUTE</span>
              <div class="admin-kpi-val" style="font-size: 16px; word-break: break-all;">${escapeHtml(hottestPath)}</div>
              <span class="admin-kpi-sub">最受欢迎页面</span>
            </div>
          </div>

          <!-- 7-Day Trend Bar Chart -->
          <div class="admin-subblock">
            <div class="admin-subblock-head">
              <h3>近 7 日访问趋势（北京时间）</h3>
              <span class="swiss-mono" style="font-size: 11px; color: var(--ink-mute);">PV / UV</span>
            </div>
            <div class="trend-chart">
              ${stats.dailySeries
                .map((d) => {
                  const pct = Math.max(4, Math.round((d.pv / maxDaily) * 100));
                  return `
                    <div class="trend-col" title="${d.fullDay}: ${d.pv} PV / ${d.uv} UV">
                      <span class="trend-val">${d.pv}</span>
                      <div class="trend-bar-wrap">
                        <div class="trend-bar" style="height: ${d.pv === 0 ? 4 : pct}%;"></div>
                      </div>
                      <span class="trend-day">${d.day}</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- 3-Column Distribution Breakdown -->
          <div class="admin-dist-grid">
            <div class="swiss-card">
              <div class="swiss-card-head">
                <h4 class="swiss-card-title">热门页面</h4>
                <span class="swiss-card-code">ROUTES</span>
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
              <div class="swiss-mono" style="font-size: 10.5px; color: var(--ink-mute); margin-bottom: 8px;">REFERRERS</div>
              ${renderRankList(topRefs, stats.totalPv)}
            </div>
          </div>

          <!-- Recent Visit Logs Table -->
          <div class="admin-subblock">
            <div class="admin-subblock-head">
              <h3>最近访客明细（最新 ${stats.recent.length} 条）</h3>
              <span class="swiss-mono" style="font-size: 11px; color: var(--ink-mute);">ASIA/SHANGHAI</span>
            </div>
            ${
              stats.recent.length
                ? `<div class="tier-table-wrap" style="margin-top: 10px;">
                    <table class="swiss-table admin-log-table">
                      <thead>
                        <tr>
                          <th>北京时间</th>
                          <th>访客 ID</th>
                          <th>地区</th>
                          <th>访问路径</th>
                          <th>设备 / 浏览器</th>
                          <th>来源</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${stats.recent
                          .slice(0, 50)
                          .map(
                            (r) => `
                          <tr>
                            <td class="swiss-mono" style="font-size: 12px; white-space: nowrap;">${escapeHtml(r.ts)}</td>
                            <td class="swiss-mono" style="font-size: 12px; color: var(--accent);">#${escapeHtml(r.visitorId || '—')}</td>
                            <td>${escapeHtml(r.region || '—')}</td>
                            <td class="swiss-mono" style="font-size: 12.5px;">${escapeHtml(r.path || '/')}</td>
                            <td style="font-size: 13px;">${escapeHtml(r.device || '—')}</td>
                            <td style="font-size: 13px; color: var(--ink-mute);">${escapeHtml(r.referrer || '直接访问')}</td>
                          </tr>
                        `
                          )
                          .join('')}
                      </tbody>
                    </table>
                  </div>`
                : '<p class="empty-state">暂无访客记录。浏览几个前台页面后点击「刷新数据」即可看到记录。</p>'
            }
          </div>
        </section>
      `;

      document.getElementById('jump-to-setup')?.addEventListener('click', () => switchTab('settings'));
      document.getElementById('btn-refresh-stats')?.addEventListener('click', () => renderTelemetryTab());
      document.getElementById('btn-export-stats')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(latestStats, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gavins-blog-analytics-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      });
      document.getElementById('btn-clear-stats')?.addEventListener('click', async () => {
        if (!window.confirm('确认清空当前统计记录？此操作不可撤销。')) return;
        await clearCloudStats();
        renderTelemetryTab();
      });
    } catch (err) {
      modeBadgeEl.textContent = '连接失败 · ERROR';
      modeBadgeEl.className = 'swiss-tag swiss-tag-accent';
      bodyEl.innerHTML = `
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="swiss-callout is-warn">
            <strong>读取云端统计失败：</strong>${escapeHtml(err.message)}。请检查 Worker 地址或管理员密码是否正确。
          </div>
          <div class="admin-btn-row">
            <button type="button" class="status-action-btn" id="btn-retry-stats">重试</button>
            <button type="button" class="status-action-btn" id="btn-fix-cfg">检查后台配置</button>
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
          .map(([label, count]) => {
            const pct = total ? Math.round((count / total) * 100) : 0;
            return `
              <div class="rank-row">
                <div class="rank-top">
                  <span class="rank-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
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
     TAB 02: QUICK PUBLISHER (MICRO-NOTES, NOW LIST & SITE BIO -> GITHUB)
     ======================================================================== */
  function renderPublishTab() {
    const snap = atmosphere.getSnapshot();
    const cfg = getAdminConfig();
    const hasGithub = Boolean(cfg.githubToken);

    bodyEl.innerHTML = `
      <div class="admin-pub-grid">
        <!-- Left: Micro-Notes Composer + Existing Notes -->
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
          <div id="draft-notes-list" class="draft-list">
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
                : '<p class="mini-note-text" style="color: var(--ink-mute);">暂无碎碎念，在上方输入后即可添加。</p>'
            }
          </div>
        </section>

        <!-- Right: NOW List + Bio/Links + One-click GitHub Push -->
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">SITE PROFILE // 近况与简介</span>
              <h2 class="panel-title" style="margin-top: 6px;">管理「此刻在做」与简介</h2>
            </div>
          </div>

          <div class="admin-form">
            <label class="admin-field">
              <span>博客一句话简介</span>
              <input id="cfg-bio-input" type="text" class="swiss-search" value="${escapeHtml(draftConfig.bio)}" />
            </label>
          </div>

          <div class="rail-divider"></div>
          <div class="admin-subblock-head">
            <h3>此刻在做（NOW · ${draftConfig.nowList.length} 项）</h3>
          </div>
          <form id="now-add-form" class="admin-form-row" style="margin-top: 10px;">
            <input id="now-tag-input" type="text" class="swiss-search" placeholder="标签如 BUILD" style="max-width: 118px;" />
            <input id="now-text-input" type="text" class="swiss-search" placeholder="正在做的事情…" />
            <button type="submit" class="status-action-btn">添加</button>
          </form>

          <div class="draft-list" style="margin-top: 12px;">
            ${
              draftConfig.nowList.length
                ? draftConfig.nowList
                    .map(
                      (item, idx) => `
                  <div class="draft-item">
                    <div>
                      <span class="swiss-tag">${escapeHtml(item.tag)}</span>
                      <span style="margin-left: 8px; font-size: 13.5px;">${escapeHtml(item.text)}</span>
                    </div>
                    <button type="button" class="status-action-btn is-danger" data-del-now="${idx}">移除</button>
                  </div>
                `
                    )
                    .join('')
                : '<p class="mini-note-text" style="color: var(--ink-mute);">当前为空。</p>'
            }
          </div>

          <div class="rail-divider"></div>
          <div id="publish-feedback"></div>
          <div class="admin-btn-row" style="margin-top: 10px;">
            <button type="button" class="featured-cta" id="btn-push-github" style="border: none; cursor: pointer;">
              ${hasGithub ? '一键推送到 GitHub 自动部署 →' : '推送到 GitHub（需先配 Token）'}
            </button>
            <button type="button" class="status-action-btn" id="btn-copy-siteconfig">复制 siteConfig.js</button>
          </div>
          <p class="chart-caption" style="margin-top: 10px;">
            推送后将直接更新 <code>src/data/siteConfig.js</code>，GitHub Actions 约 30 秒自动重新部署到 <code>blog.gavinli.top</code>。
          </p>
        </section>
      </div>
    `;

    document.getElementById('cfg-bio-input')?.addEventListener('input', (e) => {
      draftConfig.bio = e.target.value;
    });

    document.getElementById('note-compose-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const textEl = document.getElementById('note-input-text');
      const moodEl = document.getElementById('note-input-mood');
      const content = textEl.value.trim();
      if (!content) return;
      const nowSnap = atmosphere.getSnapshot();
      draftNotes.unshift({
        id: `n-${Date.now().toString(36)}`,
        date: nowSnap.dateStr,
        time: `${nowSnap.clockShort} CST`,
        phase: nowSnap.phaseMeta.label,
        mood: moodEl.value.trim() || `${nowSnap.seasonMeta.label} · ${nowSnap.weatherMeta.label}`,
        content
      });
      renderPublishTab();
    });

    bodyEl.querySelectorAll('[data-del-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftNotes.splice(Number(btn.dataset.delNote), 1);
        renderPublishTab();
      });
    });

    document.getElementById('now-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const tag = (document.getElementById('now-tag-input').value.trim() || 'NOW').toUpperCase();
      const text = document.getElementById('now-text-input').value.trim();
      if (!text) return;
      draftConfig.nowList.push({ tag, text });
      renderPublishTab();
    });

    bodyEl.querySelectorAll('[data-del-now]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draftConfig.nowList.splice(Number(btn.dataset.delNow), 1);
        renderPublishTab();
      });
    });

    document.getElementById('btn-copy-siteconfig')?.addEventListener('click', async () => {
      const code = generateSiteConfigSource(draftConfig, draftNotes);
      await navigator.clipboard.writeText(code);
      const fb = document.getElementById('publish-feedback');
      fb.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0 0 10px;">已复制完整 <code>siteConfig.js</code> 代码到剪贴板！</div>';
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
          `content(admin): update notes/profile (${atmosphere.getSnapshot().dateStr})`
        );
        fb.innerHTML = `<div class="swiss-callout is-tech" style="margin: 0 0 10px;"><strong>推送成功！</strong>提交 <code>${escapeHtml(res.sha)}</code> 已触发自动构建，约 30 秒后刷新生效（<a href="${escapeHtml(res.url)}" target="_blank" rel="noopener noreferrer">查看提交</a>）。</div>`;
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0 0 10px;"><strong>推送失败：</strong>${escapeHtml(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '一键推送到 GitHub 自动部署 →';
      }
    });
  }

  /* ========================================================================
     TAB 03: 12-SCENE BACKDROP INSPECTOR & SITE HEALTH
     ======================================================================== */
  function renderHealthTab() {
    const snap = atmosphere.getSnapshot();
    const tags = getAllTags();
    const keys = [
      { id: 'day', label: '白天', phase: 'morning' },
      { id: 'golden', label: '晨昏', phase: 'sunset' },
      { id: 'night', label: '深夜', phase: 'night' }
    ];

    bodyEl.innerHTML = `
      <section class="liquid-glass liquid-glass-elevated admin-panel">
        <div class="admin-panel-head">
          <div>
            <span class="swiss-kicker">HEALTH // 12 幕庄园原画巡检</span>
            <h2 class="panel-title" style="margin-top: 6px;">背景资源与站点状态</h2>
          </div>
          <span class="swiss-mono" style="font-size: 12px; color: var(--ink-mute);">
            ART MODE: ${document.documentElement.dataset.artMode || 'native'}
          </span>
        </div>

        <div class="admin-kpi-grid" style="margin-bottom: 22px;">
          <div class="admin-kpi">
            <span class="admin-kpi-label">ARTICLES</span>
            <div class="admin-kpi-val">${POSTS.length}</div>
            <span class="admin-kpi-sub">已发布文章</span>
          </div>
          <div class="admin-kpi">
            <span class="admin-kpi-label">TAGS</span>
            <div class="admin-kpi-val">${tags.length}</div>
            <span class="admin-kpi-sub">全站标签数</span>
          </div>
          <div class="admin-kpi">
            <span class="admin-kpi-label">MICRO NOTES</span>
            <div class="admin-kpi-val">${MICRO_NOTES.length}</div>
            <span class="admin-kpi-sub">已发布碎碎念</span>
          </div>
          <div class="admin-kpi">
            <span class="admin-kpi-label">BEIJING CLOCK</span>
            <div class="admin-kpi-val" style="font-size: 20px;">${snap.clockShort}</div>
            <span class="admin-kpi-sub">${snap.phaseMeta.label} · ${snap.seasonMeta.label} · ${snap.weatherMeta.label}</span>
          </div>
        </div>

        <div class="backdrop-matrix" id="backdrop-matrix">
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
                    <div class="swiss-mono" style="font-size: 11px; color: var(--ink-mute); margin: 4px 0 10px;">${file}</div>
                    <div class="backdrop-check-foot">
                      <span class="swiss-mono" style="font-size: 11px; color: var(--ink-mute);" data-probe-dim>-- × --</span>
                      <button type="button" class="status-action-btn" data-preview-season="${s.id}" data-preview-phase="${k.phase}">实时预览</button>
                    </div>
                  </div>
                `;
              })
              .join('')
          ).join('')}
        </div>
      </section>
    `;

    // Probe all 12 images live
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
     TAB 04: BACKEND WORKER & GITHUB TOKEN SETTINGS
     ======================================================================== */
  function renderSettingsTab() {
    const cfg = getAdminConfig();
    bodyEl.innerHTML = `
      <div class="admin-pub-grid">
        <section class="liquid-glass liquid-glass-elevated admin-panel">
          <div class="admin-panel-head">
            <div>
              <span class="swiss-kicker">SETTINGS // 密钥与接口配置</span>
              <h2 class="panel-title" style="margin-top: 6px;">连接云端统计与 GitHub 发布</h2>
            </div>
          </div>

          <div class="swiss-callout is-tech" style="margin-top: 14px;">
            <strong>隐私与安全承诺：</strong>下方填写的管理员密码与 GitHub Token <strong>仅保存在你当前浏览器的本地存储（localStorage）中</strong>，绝不会提交到公开代码仓库。
          </div>

          <form id="admin-settings-form" class="admin-form">
            <label class="admin-field">
              <span>Cloudflare Analytics Worker 地址</span>
              <input id="set-worker-url" type="url" class="swiss-search" placeholder="https://blog-analytics.你的账号.workers.dev" value="${escapeHtml(cfg.workerUrl)}" />
            </label>

            <label class="admin-field">
              <span>Worker 管理员密码（ADMIN_TOKEN）</span>
              <input id="set-admin-token" type="password" class="swiss-search" placeholder="与 Cloudflare Worker Secret 中设置一致" value="${escapeHtml(cfg.adminToken)}" />
            </label>

            <div class="rail-divider"></div>

            <label class="admin-field">
              <span>GitHub Fine-grained Token（用于浏览器一键发碎碎念 / 改配置）</span>
              <input id="set-github-token" type="password" class="swiss-search" placeholder="github_pat_...（仅授单仓库 Contents 读写）" value="${escapeHtml(cfg.githubToken)}" />
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
              <span class="swiss-kicker">QUICK GUIDE // 2 分钟部署说明</span>
              <h2 class="panel-title" style="margin-top: 6px;">如何免费开通全网访客统计</h2>
            </div>
          </div>

          <ol class="step-list" style="margin-top: 16px;">
            <li>
              <span class="step-badge">01</span>
              <span>登录 Cloudflare 控制台 → <strong>Workers KV</strong> 创建命名空间 <code>BLOG_ANALYTICS</code>。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>创建一个新 Worker，把项目里的 <code>worker/analytics-worker.js</code> 完整粘贴部署。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>在 Worker 的 <strong>Settings → Bindings</strong> 绑定 KV：变量名 <code>ANALYTICS_KV</code> 指向 <code>BLOG_ANALYTICS</code>。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span>在 <strong>Variables and Secrets</strong> 添加加密变量 <code>ADMIN_TOKEN</code>（自定管理员密码）。</span>
            </li>
            <li>
              <span class="step-badge">05</span>
              <span>把 Worker 网址和密码填进左侧保存，再点<strong>「把统计地址写入线上站点」</strong>（或手动填进 <code>src/data/siteConfig.js</code> 的 <code>analyticsEndpoint</code>），所有全网访客就会自动实时上报！</span>
            </li>
          </ol>

          <p class="chart-caption" style="margin-top: 16px;">
            完整图文说明已保存在项目根目录 <code>ADMIN_SETUP.md</code>。
          </p>
        </section>
      </div>
    `;

    document.getElementById('admin-settings-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const saved = saveAdminConfig({
        workerUrl: document.getElementById('set-worker-url').value,
        adminToken: document.getElementById('set-admin-token').value,
        githubToken: document.getElementById('set-github-token').value,
        githubOwner: document.getElementById('set-gh-owner').value.trim() || 'Gaviniar',
        githubRepo: document.getElementById('set-gh-repo').value.trim() || 'Gaviniar.github.io'
      });
      draftConfig.analyticsEndpoint = saved.workerUrl;
      document.getElementById('settings-feedback').innerHTML =
        '<div class="swiss-callout is-tech" style="margin: 6px 0;"><strong>已保存到本机浏览器！</strong>切换到「01 访客与流量记录」即可查看数据。</div>';
    });

    document.getElementById('btn-sync-endpoint')?.addEventListener('click', async () => {
      const workerUrl = document.getElementById('set-worker-url').value.trim().replace(/\/+$/, '');
      const fb = document.getElementById('settings-feedback');
      if (!workerUrl) {
        fb.innerHTML = '<div class="swiss-callout is-warn" style="margin: 6px 0;">请先填写 Cloudflare Worker 地址。</div>';
        return;
      }
      saveAdminConfig({
        workerUrl,
        adminToken: document.getElementById('set-admin-token').value,
        githubToken: document.getElementById('set-github-token').value
      });
      draftConfig.analyticsEndpoint = workerUrl;
      try {
        const res = await publishSiteConfigToGitHub(
          draftConfig,
          draftNotes,
          'feat(analytics): configure Cloudflare Worker endpoint'
        );
        fb.innerHTML = `<div class="swiss-callout is-tech" style="margin: 6px 0;"><strong>已推送到 GitHub（${escapeHtml(res.sha)}）！</strong>约 30 秒部署完成后，所有访客访问 <code>blog.gavinli.top</code> 都会自动统计。</div>`;
      } catch (err) {
        fb.innerHTML = `<div class="swiss-callout is-warn" style="margin: 6px 0;">${escapeHtml(err.message)}</div>`;
      }
    });
  }

  switchTab(activeTab);
}
