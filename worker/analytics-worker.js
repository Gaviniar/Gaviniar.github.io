/**
 * Gavin's Blog — 轻量级全网访客统计后端（Cloudflare Workers + KV）
 *
 * 免费额度：每天 100,000 次请求，零服务器运维，自带访客国家/城市地理定位（request.cf）。
 *
 * 部署步骤（全程在 Cloudflare 网页控制台 2 分钟完成，详见 ADMIN_SETUP.md）：
 * 1. Workers & Pages → KV → 创建命名空间 `BLOG_ANALYTICS`
 * 2. Workers & Pages → 创建 Worker → 粘贴本文件全部代码并 Deploy
 * 3. Worker 设置 → Bindings → 添加 KV 绑定：变量名填 `ANALYTICS_KV`，选择 `BLOG_ANALYTICS`
 * 4. Worker 设置 → Variables and Secrets → 添加 Secret：
 *      - `ADMIN_TOKEN`：你自定义的管理员密码（长一点更安全）
 *      - `ALLOWED_ORIGIN`（可选）：`https://blog.gavinli.top`（不填默认允许所有来源）
 */

const MAX_RECENT_LOGS = 200;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || '*';
  const allowOrigin = allowed === '*' || origin === allowed || origin.startsWith('http://localhost:')
    ? origin
    : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env)
    }
  });
}

function getBeijingDay(date = new Date()) {
  const cst = new Date(date.getTime() + 8 * 3600 * 1000);
  return cst.toISOString().slice(0, 10);
}

function getBeijingTimestamp(date = new Date()) {
  const cst = new Date(date.getTime() + 8 * 3600 * 1000);
  return cst.toISOString().replace('T', ' ').slice(0, 19);
}

function parseDevice(ua = '') {
  const lower = ua.toLowerCase();
  let os = 'Other';
  if (/iphone|ipad|ios/.test(lower)) os = 'iOS';
  else if (/android/.test(lower)) os = 'Android';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/mac os x|macintosh/.test(lower)) os = 'macOS';
  else if (/linux/.test(lower)) os = 'Linux';

  let browser = 'Browser';
  if (/edg\//.test(lower)) browser = 'Edge';
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = 'Chrome';
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = 'Safari';
  else if (/firefox\//.test(lower)) browser = 'Firefox';

  const type = /mobile|iphone|android/.test(lower) && !/ipad/.test(lower) ? 'Mobile' : 'Desktop';
  return { os, browser, type };
}

async function sha256Short(input) {
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hashBuf).slice(0, 6));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isAuthorized(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const header = request.headers.get('Authorization') || '';
  return header === `Bearer ${token}`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const kv = env.ANALYTICS_KV;
    if (!kv) {
      return json({ ok: false, error: 'Missing KV binding: ANALYTICS_KV' }, 500, request, env);
    }

    // 1. Public beacon endpoint: POST /api/collect
    if (url.pathname === '/api/collect' && request.method === 'POST') {
      try {
        const body = await request.json();
        const path = String(body.path || '/').slice(0, 140);
        const title = String(body.title || '').slice(0, 120);
        const referrer = String(body.referrer || '直接访问').slice(0, 180);
        const screen = String(body.screen || '').slice(0, 24);
        const lang = String(body.lang || '').slice(0, 16);

        const ua = request.headers.get('User-Agent') || '';
        // Skip obvious bots/crawlers
        if (/bot|spider|crawl|headless|slurp|bingpreview/i.test(ua)) {
          return json({ ok: true, skipped: 'bot' }, 200, request, env);
        }

        const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const cf = request.cf || {};
        const country = cf.country || 'UN';
        const city = cf.city || cf.region || 'Unknown';
        const device = parseDevice(ua);
        const day = getBeijingDay();
        const ts = getBeijingTimestamp();
        const visitorId = await sha256Short(`${ip}|${ua}|${day}`);

        // Load summary + logs
        const summary = (await kv.get('summary', 'json')) || {
          totalPv: 0,
          daily: {},
          pages: {},
          countries: {},
          devices: {},
          referrers: {}
        };
        const recent = (await kv.get('recent', 'json')) || [];

        summary.totalPv = (summary.totalPv || 0) + 1;

        if (!summary.daily[day]) summary.daily[day] = { pv: 0, uvs: [] };
        summary.daily[day].pv += 1;
        if (!summary.daily[day].uvs.includes(visitorId) && summary.daily[day].uvs.length < 2000) {
          summary.daily[day].uvs.push(visitorId);
        }

        // Keep only last 30 days in daily map
        const days = Object.keys(summary.daily).sort();
        while (days.length > 30) {
          delete summary.daily[days.shift()];
        }

        summary.pages[path] = (summary.pages[path] || 0) + 1;
        const regionKey = city && city !== 'Unknown' ? `${country} · ${city}` : country;
        summary.countries[regionKey] = (summary.countries[regionKey] || 0) + 1;
        const devKey = `${device.os} / ${device.browser}`;
        summary.devices[devKey] = (summary.devices[devKey] || 0) + 1;

        let refHost = '直接访问';
        if (referrer && referrer !== '直接访问') {
          try {
            refHost = new URL(referrer).hostname || '直接访问';
          } catch {
            refHost = referrer.slice(0, 48);
          }
        }
        summary.referrers[refHost] = (summary.referrers[refHost] || 0) + 1;

        recent.unshift({
          ts,
          day,
          visitorId,
          path,
          title,
          region: regionKey,
          device: `${device.type} · ${device.os} · ${device.browser}`,
          referrer: refHost,
          screen,
          lang
        });
        if (recent.length > MAX_RECENT_LOGS) recent.length = MAX_RECENT_LOGS;

        await Promise.all([
          kv.put('summary', JSON.stringify(summary)),
          kv.put('recent', JSON.stringify(recent))
        ]);

        return json({ ok: true }, 200, request, env);
      } catch (err) {
        return json({ ok: false, error: err.message }, 400, request, env);
      }
    }

    // 2. Authenticated Admin Stats: GET /api/stats
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized: 管理员密码错误' }, 401, request, env);
      }

      const summary = (await kv.get('summary', 'json')) || {
        totalPv: 0,
        daily: {},
        pages: {},
        countries: {},
        devices: {},
        referrers: {}
      };
      const recent = (await kv.get('recent', 'json')) || [];

      const today = getBeijingDay();
      const todayStat = summary.daily[today] || { pv: 0, uvs: [] };

      // Count unique visitor IDs across retained days
      const allUvSet = new Set();
      const dailySeries = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000);
        const key = getBeijingDay(d);
        const entry = summary.daily[key] || { pv: 0, uvs: [] };
        dailySeries.push({ day: key.slice(5), fullDay: key, pv: entry.pv, uv: entry.uvs.length });
      }
      for (const entry of Object.values(summary.daily)) {
        for (const id of entry.uvs || []) allUvSet.add(id);
      }

      return json(
        {
          ok: true,
          mode: 'cloud',
          totalPv: summary.totalPv || 0,
          totalUv: allUvSet.size,
          todayPv: todayStat.pv,
          todayUv: todayStat.uvs.length,
          dailySeries,
          pages: summary.pages || {},
          countries: summary.countries || {},
          devices: summary.devices || {},
          referrers: summary.referrers || {},
          recent
        },
        200,
        request,
        env
      );
    }

    // 3. Authenticated Reset Logs: DELETE /api/clear
    if (url.pathname === '/api/clear' && request.method === 'DELETE') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
      }
      await Promise.all([kv.delete('summary'), kv.delete('recent')]);
      return json({ ok: true }, 200, request, env);
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: "Gavin's Blog Analytics Worker" }, 200, request, env);
    }

    return json({ ok: false, error: 'Not found' }, 404, request, env);
  }
};
