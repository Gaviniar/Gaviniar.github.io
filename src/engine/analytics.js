/**
 * Visitor Analytics, Engagement, Interactions & Admin Security Client
 * - Dual Mode: Cloud Worker (via stat.blog.gavinli.top) + Local Browser Fallback
 * - Supports PV/UV, reading depth & dwell time, single-row log deletion,
 *   server ignore rules, likes, comments/guestbook, admin lock verification & audit logs.
 */

import { SITE_CONFIG } from '../data/siteConfig.js';
import { getBeijingDateParts, formatPad } from './atmosphere.js';

const LOCAL_LOGS_KEY = 'gavins_blog_local_visits_v1';
const LOCAL_AUDIT_KEY = 'gavins_blog_local_audit_v1';
const ADMIN_CFG_KEY = 'gavins_blog_admin_cfg_v1';
const IGNORE_SELF_KEY = 'gavins_blog_ignore_self_v1';
const ADMIN_UNLOCK_KEY = 'gavins_blog_admin_unlocked_v1';
const MAX_LOCAL_LOGS = 150;

let lastTrackedKey = '';
let lastTrackedAt = 0;

export function isOwnerIgnored() {
  try {
    return localStorage.getItem(IGNORE_SELF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setOwnerIgnored(enabled) {
  try {
    if (enabled) localStorage.setItem(IGNORE_SELF_KEY, '1');
    else localStorage.removeItem(IGNORE_SELF_KEY);
  } catch {
    // ignore
  }
  return isOwnerIgnored();
}

export function isAdminUnlocked() {
  try {
    return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdminUnlocked(unlocked) {
  try {
    if (unlocked) sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1');
    else sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch {
    // ignore
  }
}

export function getPublicEndpoint() {
  const cfg = getAdminConfig();
  return (SITE_CONFIG.analyticsEndpoint || cfg.workerUrl || '').replace(/\/+$/, '');
}

export function getAdminConfig() {
  try {
    const raw = localStorage.getItem(ADMIN_CFG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const savedUrl = (parsed.workerUrl || '').replace(/\/+$/, '');
    const siteUrl = (SITE_CONFIG.analyticsEndpoint || '').replace(/\/+$/, '');
    const workerUrl =
      savedUrl && !savedUrl.includes('.workers.dev')
        ? savedUrl
        : siteUrl || savedUrl;
    return {
      workerUrl,
      adminToken: parsed.adminToken || '',
      githubToken: parsed.githubToken || '',
      githubOwner: parsed.githubOwner || 'Gaviniar',
      githubRepo: parsed.githubRepo || 'Gaviniar.github.io',
      githubBranch: parsed.githubBranch || 'main'
    };
  } catch {
    return {
      workerUrl: (SITE_CONFIG.analyticsEndpoint || '').replace(/\/+$/, ''),
      adminToken: '',
      githubToken: '',
      githubOwner: 'Gaviniar',
      githubRepo: 'Gaviniar.github.io',
      githubBranch: 'main'
    };
  }
}

export function saveAdminConfig(patch) {
  const next = { ...getAdminConfig(), ...patch };
  if (next.workerUrl) next.workerUrl = next.workerUrl.trim().replace(/\/+$/, '');
  localStorage.setItem(ADMIN_CFG_KEY, JSON.stringify(next));
  return next;
}

function getBeijingNowStrings() {
  const p = getBeijingDateParts();
  const day = `${p.year}-${formatPad(p.month)}-${formatPad(p.day)}`;
  const ts = `${day} ${formatPad(p.hour)}:${formatPad(p.minute)}:${formatPad(p.second)}`;
  return { day, hour: p.hour, ts };
}

function detectLocalDevice() {
  const ua = navigator.userAgent || '';
  const lower = ua.toLowerCase();
  let os = 'Other';
  if (/iphone|ipad|ios/.test(lower)) os = 'iOS';
  else if (/android/.test(lower)) os = 'Android';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/mac os x|macintosh/.test(lower)) os = 'macOS';
  else if (/linux/.test(lower)) os = 'Linux';

  let browser = 'Browser';
  if (/edg\//.test(lower)) browser = 'Edge';
  else if (/chrome\//.test(lower)) browser = 'Chrome';
  else if (/safari\//.test(lower)) browser = 'Safari';
  else if (/firefox\//.test(lower)) browser = 'Firefox';

  const type = window.innerWidth <= 768 ? 'Mobile' : 'Desktop';
  return { os, browser, type };
}

function getLocalSessionId() {
  let sid = sessionStorage.getItem('gavins_blog_sid');
  if (!sid) {
    sid = Math.random().toString(16).slice(2, 10);
    sessionStorage.setItem('gavins_blog_sid', sid);
  }
  return sid;
}

export function trackPageView(routePath, pageTitle) {
  if (routePath.startsWith('#/admin')) return;
  if (isOwnerIgnored()) return;

  const cleanPath = routePath.replace(/^#/, '') || '/';
  const nowMs = Date.now();
  if (cleanPath === lastTrackedKey && nowMs - lastTrackedAt < 3000) return;
  lastTrackedKey = cleanPath;
  lastTrackedAt = nowMs;

  const { day, hour, ts } = getBeijingNowStrings();
  const dev = detectLocalDevice();
  const screen = `${window.innerWidth}×${window.innerHeight}`;
  const lang = navigator.language || 'zh-CN';

  let refHost = '直接访问';
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname !== window.location.hostname) {
        refHost = refUrl.hostname;
      }
    } catch {
      refHost = '外部链接';
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    existing.unshift({
      id: `loc_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      ts,
      day,
      hour,
      visitorId: getLocalSessionId(),
      path: cleanPath,
      title: pageTitle || document.title,
      region: '本机预览 (Local)',
      device: `${dev.type} · ${dev.os} · ${dev.browser}`,
      referrer: refHost,
      screen,
      lang
    });
    if (existing.length > MAX_LOCAL_LOGS) existing.length = MAX_LOCAL_LOGS;
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }

  const endpoint = getPublicEndpoint();
  if (!endpoint) return;

  const payload = JSON.stringify({
    path: cleanPath,
    title: pageTitle || document.title,
    referrer: document.referrer || '直接访问',
    screen,
    lang
  });

  try {
    fetch(`${endpoint}/api/collect`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: payload,
      keepalive: true
    }).catch(() => {});
  } catch {
    // silent
  }
}

export function trackEngagement(routePath, dwellSec, maxScroll) {
  if (!routePath || routePath.startsWith('#/admin')) return;
  if (isOwnerIgnored()) return;
  if (dwellSec < 2) return;

  const endpoint = getPublicEndpoint();
  if (!endpoint) return;

  const cleanPath = routePath.replace(/^#/, '') || '/';
  try {
    fetch(`${endpoint}/api/engage`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        path: cleanPath,
        dwellSec: Math.round(dwellSec),
        maxScroll: Math.round(maxScroll)
      }),
      keepalive: true
    }).catch(() => {});
  } catch {
    // silent
  }
}

/* ==========================================================================
   LOCAL STATS FALLBACK
   ========================================================================== */
export function getLocalStatsSnapshot(range = '7d') {
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
  } catch {
    recent = [];
  }

  const { day: today } = getBeijingNowStrings();
  const pages = {};
  const countries = {};
  const devices = {};
  const referrers = {};
  const dailyMap = {};
  const hourlySeries = Array(24).fill(0);
  const uvAll = new Set();
  const uvToday = new Set();
  let todayPv = 0;

  for (const item of recent) {
    pages[item.path] = (pages[item.path] || 0) + 1;
    countries[item.region] = (countries[item.region] || 0) + 1;
    const devShort = item.device.split(' · ').slice(1).join(' / ') || item.device;
    devices[devShort] = (devices[devShort] || 0) + 1;
    referrers[item.referrer] = (referrers[item.referrer] || 0) + 1;
    if (typeof item.hour === 'number' && item.hour >= 0 && item.hour < 24) {
      hourlySeries[item.hour] += 1;
    }

    uvAll.add(item.visitorId);
    if (item.day === today) {
      todayPv += 1;
      uvToday.add(item.visitorId);
    }
    if (!dailyMap[item.day]) dailyMap[item.day] = { pv: 0, uvs: new Set() };
    dailyMap[item.day].pv += 1;
    dailyMap[item.day].uvs.add(item.visitorId);
  }

  const daysCount = range === '30d' ? 30 : range === 'today' ? 1 : 7;
  const dailySeries = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400 * 1000);
    const p = getBeijingDateParts(d);
    const fullDay = `${p.year}-${formatPad(p.month)}-${formatPad(p.day)}`;
    const entry = dailyMap[fullDay];
    dailySeries.push({
      day: fullDay.slice(5),
      fullDay,
      pv: entry ? entry.pv : 0,
      uv: entry ? entry.uvs.size : 0
    });
  }

  return {
    ok: true,
    mode: 'local',
    range,
    totalPv: recent.length,
    totalUv: uvAll.size,
    rangePv: range === 'today' ? todayPv : recent.length,
    rangeUv: range === 'today' ? uvToday.size : uvAll.size,
    todayPv,
    todayUv: uvToday.size,
    onlineCount: 1,
    dailySeries,
    hourlySeries,
    pages,
    countries,
    devices,
    referrers,
    engagement: {},
    likes: {},
    commentTotal: 0,
    pendingComments: 0,
    settings: { ignorePaths: ['/__diag'], ignoreUas: [], commentModeration: 'auto', bannedVisitors: [] },
    recent
  };
}

export function clearLocalStats() {
  localStorage.removeItem(LOCAL_LOGS_KEY);
}

/* ==========================================================================
   CLOUD ADMIN & PUBLIC APIs
   ========================================================================== */
export async function verifyAdminToken(workerUrl, adminToken) {
  const endpoint = (workerUrl || getAdminConfig().workerUrl || '').replace(/\/+$/, '');
  if (!endpoint) throw new Error('尚未配置云端统计接口地址');
  if (!adminToken) throw new Error('请输入管理员密码');

  // Try v2 /api/auth/verify first, gracefully fall back to /api/stats for v1 workers
  let res = await fetch(`${endpoint}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (res.status === 404) {
    res = await fetch(`${endpoint}/api/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `验证失败 (HTTP ${res.status})`);
  }
  return true;
}

export async function fetchAnalyticsStats(range = '7d') {
  const cfg = getAdminConfig();
  if (cfg.workerUrl && cfg.adminToken) {
    const res = await fetch(`${cfg.workerUrl}/api/stats?range=${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${cfg.adminToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }
  return getLocalStatsSnapshot(range);
}

export async function deleteVisitLogs(ids = []) {
  const cfg = getAdminConfig();
  if (!cfg.workerUrl || !cfg.adminToken) {
    const existing = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    const idSet = new Set(ids);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(existing.filter((r) => !idSet.has(r.id))));
    return { ok: true, deleted: ids.length };
  }
  const res = await fetch(`${cfg.workerUrl}/api/logs/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.adminToken}`
    },
    body: JSON.stringify({ ids })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}（请确认 Cloudflare Worker 已更新至最新代码）`);
  return data;
}

export async function clearCloudStats() {
  const cfg = getAdminConfig();
  if (!cfg.workerUrl || !cfg.adminToken) {
    clearLocalStats();
    return { ok: true, mode: 'local' };
  }
  const res = await fetch(`${cfg.workerUrl}/api/clear`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${cfg.adminToken}` }
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function updateServerSettings(patch) {
  const cfg = getAdminConfig();
  if (!cfg.workerUrl || !cfg.adminToken) {
    throw new Error('请先配置云端统计地址与管理员密码');
  }
  const res = await fetch(`${cfg.workerUrl}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.adminToken}`
    },
    body: JSON.stringify(patch)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}（请确认 Cloudflare Worker 已更新至最新版）`);
  return data;
}

/* ==========================================================================
   LIKES & COMMENTS / GUESTBOOK APIs
   ========================================================================== */
export async function fetchPostLikes(slug) {
  const endpoint = getPublicEndpoint();
  if (!endpoint) return { ok: true, count: 0, liked: false };
  try {
    const res = await fetch(`${endpoint}/api/likes?slug=${encodeURIComponent(slug)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, count: 0, liked: false };
    return data;
  } catch {
    return { ok: false, count: 0, liked: false };
  }
}

export async function togglePostLike(slug) {
  const endpoint = getPublicEndpoint();
  if (!endpoint) throw new Error('尚未配置互动接口');
  const res = await fetch(`${endpoint}/api/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchPublicComments(target) {
  const endpoint = getPublicEndpoint();
  if (!endpoint) return [];
  try {
    const res = await fetch(`${endpoint}/api/comments?target=${encodeURIComponent(target)}`);
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok && Array.isArray(data.comments) ? data.comments : [];
  } catch {
    return [];
  }
}

export async function submitPublicComment({ target, author, email, content, website = '' }) {
  const endpoint = getPublicEndpoint();
  if (!endpoint) throw new Error('尚未配置留言接口');
  const cfg = getAdminConfig();
  const headers = { 'Content-Type': 'application/json' };
  // If owner is logged into admin in this browser, attach token so comment gets owner badge
  if (cfg.adminToken && isAdminUnlocked()) {
    headers.Authorization = `Bearer ${cfg.adminToken}`;
  }
  const res = await fetch(`${endpoint}/api/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ target, author, email, content, website })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `提交失败 (HTTP ${res.status})`);
  return data;
}

export async function fetchAdminComments() {
  const cfg = getAdminConfig();
  if (!cfg.workerUrl || !cfg.adminToken) {
    return { ok: true, comments: [], settings: { commentModeration: 'auto', bannedVisitors: [] } };
  }
  const res = await fetch(`${cfg.workerUrl}/api/comments?scope=all`, {
    headers: { Authorization: `Bearer ${cfg.adminToken}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}（请先更新 Cloudflare Worker）`);
  return data;
}

export async function moderateAdminComment(payload) {
  const cfg = getAdminConfig();
  const res = await fetch(`${cfg.workerUrl}/api/comments`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.adminToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function deleteAdminComment(id) {
  const cfg = getAdminConfig();
  const res = await fetch(`${cfg.workerUrl}/api/comments?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${cfg.adminToken}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ==========================================================================
   AUDIT LOGS
   ========================================================================== */
export async function recordAuditLog(action, detail = '') {
  const { ts } = getBeijingNowStrings();
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
    local.unshift({ ts, action, detail });
    if (local.length > 80) local.length = 80;
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(local));
  } catch {
    // ignore
  }

  const cfg = getAdminConfig();
  if (!cfg.workerUrl || !cfg.adminToken) return;
  try {
    await fetch(`${cfg.workerUrl}/api/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.adminToken}`
      },
      body: JSON.stringify({ action, detail })
    });
  } catch {
    // ignore
  }
}

export async function fetchAuditLogs() {
  const cfg = getAdminConfig();
  if (cfg.workerUrl && cfg.adminToken) {
    try {
      const res = await fetch(`${cfg.workerUrl}/api/audit`, {
        headers: { Authorization: `Bearer ${cfg.adminToken}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.logs)) return data.logs;
    } catch {
      // fall through to local
    }
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
  } catch {
    return [];
  }
}
