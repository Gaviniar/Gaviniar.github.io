/**
 * Visitor Analytics Client (Dual Mode: Cloud Worker + Local Browser Fallback)
 * - Automatically sends anonymous pageview beacons to Cloudflare Worker if configured
 * - Always maintains a clean local visit buffer so Admin Console works immediately out of the box
 */

import { SITE_CONFIG } from '../data/siteConfig.js';
import { getBeijingDateParts, formatPad } from './atmosphere.js';

const LOCAL_LOGS_KEY = 'gavins_blog_local_visits_v1';
const ADMIN_CFG_KEY = 'gavins_blog_admin_cfg_v1';
const MAX_LOCAL_LOGS = 120;

export function getAdminConfig() {
  try {
    const raw = localStorage.getItem(ADMIN_CFG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      workerUrl: (parsed.workerUrl || SITE_CONFIG.analyticsEndpoint || '').replace(/\/+$/, ''),
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
  return { day, ts };
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
  // Never track admin dashboard views as visitor traffic
  if (routePath.startsWith('#/admin')) return;

  const cleanPath = routePath.replace(/^#/, '') || '/';
  const { day, ts } = getBeijingNowStrings();
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

  // 1. Store locally for instant feedback in Local Mode
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    existing.unshift({
      ts,
      day,
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
    // ignore storage quota error
  }

  // 2. Send beacon to Cloudflare Worker if configured
  const endpoint = (SITE_CONFIG.analyticsEndpoint || getAdminConfig().workerUrl || '').replace(/\/+$/, '');
  if (!endpoint) return;

  const payload = JSON.stringify({
    path: cleanPath,
    title: pageTitle || document.title,
    referrer: document.referrer || '直接访问',
    screen,
    lang
  });

  // Use CORS-simple fetch (credentials: 'omit' + text/plain) instead of sendBeacon(application/json),
  // because sendBeacon forces credentials:'include' which fails preflight when the Worker omits Allow-Credentials.
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
    // silent fail
  }
}

export function getLocalStatsSnapshot() {
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
  const uvAll = new Set();
  const uvToday = new Set();
  let todayPv = 0;

  for (const item of recent) {
    pages[item.path] = (pages[item.path] || 0) + 1;
    countries[item.region] = (countries[item.region] || 0) + 1;
    const devShort = item.device.split(' · ').slice(1).join(' / ') || item.device;
    devices[devShort] = (devices[devShort] || 0) + 1;
    referrers[item.referrer] = (referrers[item.referrer] || 0) + 1;

    uvAll.add(item.visitorId);
    if (item.day === today) {
      todayPv += 1;
      uvToday.add(item.visitorId);
    }
    if (!dailyMap[item.day]) dailyMap[item.day] = { pv: 0, uvs: new Set() };
    dailyMap[item.day].pv += 1;
    dailyMap[item.day].uvs.add(item.visitorId);
  }

  const dailySeries = [];
  for (let i = 6; i >= 0; i--) {
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
    totalPv: recent.length,
    totalUv: uvAll.size,
    todayPv,
    todayUv: uvToday.size,
    dailySeries,
    pages,
    countries,
    devices,
    referrers,
    recent
  };
}

export function clearLocalStats() {
  localStorage.removeItem(LOCAL_LOGS_KEY);
}

export async function fetchAnalyticsStats() {
  const cfg = getAdminConfig();
  if (cfg.workerUrl && cfg.adminToken) {
    const res = await fetch(`${cfg.workerUrl}/api/stats`, {
      headers: { Authorization: `Bearer ${cfg.adminToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }
  return getLocalStatsSnapshot();
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
