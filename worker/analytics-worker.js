/**
 * Gavin's Blog — 全栈无服务器后端（Cloudflare Workers + KV）
 *
 * 功能涵盖：
 * 1. 全网访客统计（PV/UV、近 30 天趋势、24 小时时段分布、5 分钟实时在线人数、单条日志删除、路径/UA 屏蔽规则）
 * 2. 文章阅读深度与停留时长统计（完读率 >= 80%、平均停留秒数）
 * 3. 读者互动（文章点赞、文章评论 & 站点留言板、管理员审核/站长回复/防刷拉黑）
 * 4. 安全与审计（管理员密码校验、操作审计日志）
 *
 * 部署方式：直接全选粘贴到 Cloudflare Worker（blog-analytics）并点击 Deploy 即可。
 * 既有 KV 绑定 `ANALYTICS_KV` 与 Secret `ADMIN_TOKEN` 无需修改。
 */

const MAX_RECENT_LOGS = 300;
const MAX_COMMENTS = 500;
const MAX_AUDIT_LOGS = 120;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = env.ALLOWED_ORIGIN || '*';
  const allowOrigin =
    allowed === '*' || origin === allowed || origin.startsWith('http://localhost:')
      ? origin
      : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
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

function getBeijingNow(date = new Date()) {
  const cst = new Date(date.getTime() + 8 * 3600 * 1000);
  const iso = cst.toISOString();
  return {
    day: iso.slice(0, 10),
    hour: Number(iso.slice(11, 13)),
    ts: iso.replace('T', ' ').slice(0, 19)
  };
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

function getVisitorMeta(request) {
  const ua = request.headers.get('User-Agent') || '';
  const ip =
    request.headers.get('X-Visitor-IP') ||
    request.headers.get('CF-Connecting-IP') ||
    '0.0.0.0';
  const cf = request.cf || {};
  const country = request.headers.get('X-Visitor-Country') || cf.country || 'UN';
  const city = request.headers.get('X-Visitor-City') || cf.city || cf.region || 'Unknown';
  const regionKey = city && city !== 'Unknown' ? `${country} · ${city}` : country;
  return { ua, ip, country, city, regionKey };
}

async function appendAudit(kv, action, detail = '') {
  const logs = (await kv.get('audit', 'json')) || [];
  const { ts } = getBeijingNow();
  logs.unshift({
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ts,
    action: String(action || '').slice(0, 64),
    detail: String(detail || '').slice(0, 220)
  });
  if (logs.length > MAX_AUDIT_LOGS) logs.length = MAX_AUDIT_LOGS;
  await kv.put('audit', JSON.stringify(logs));
  return logs;
}

async function getSettings(kv) {
  const raw = (await kv.get('settings', 'json')) || {};
  return {
    ignorePaths: Array.isArray(raw.ignorePaths) ? raw.ignorePaths : ['/__diag'],
    ignoreUas: Array.isArray(raw.ignoreUas) ? raw.ignoreUas : [],
    commentModeration: raw.commentModeration === 'manual' ? 'manual' : 'auto',
    bannedVisitors: Array.isArray(raw.bannedVisitors) ? raw.bannedVisitors : []
  };
}

function defaultSummary() {
  return {
    totalPv: 0,
    daily: {},
    hourly: Array(24).fill(0),
    pages: {},
    countries: {},
    devices: {},
    referrers: {}
  };
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

    // ------------------------------------------------------------------
    // 0. Health check & Admin Auth Verify
    // ------------------------------------------------------------------
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: "Gavin's Blog Backend Worker v2", ts: getBeijingNow().ts }, 200, request, env);
    }

    if (url.pathname === '/api/auth/verify' && request.method === 'GET') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: '管理员密码错误' }, 401, request, env);
      }
      return json({ ok: true, verified: true }, 200, request, env);
    }

    // ------------------------------------------------------------------
    // 1. Public Pageview Collect: POST /api/collect
    // ------------------------------------------------------------------
    if (url.pathname === '/api/collect' && request.method === 'POST') {
      try {
        const body = await request.json();
        const path = String(body.path || '/').slice(0, 140);
        const title = String(body.title || '').slice(0, 120);
        const referrer = String(body.referrer || '直接访问').slice(0, 180);
        const screen = String(body.screen || '').slice(0, 24);
        const lang = String(body.lang || '').slice(0, 16);

        const { ua, ip, regionKey } = getVisitorMeta(request);
        if (/bot|spider|crawl|headless|slurp|bingpreview/i.test(ua)) {
          return json({ ok: true, skipped: 'bot' }, 200, request, env);
        }

        const settings = await getSettings(kv);
        if (settings.ignorePaths.some((p) => p && path.startsWith(p))) {
          return json({ ok: true, skipped: 'ignored_path' }, 200, request, env);
        }
        if (settings.ignoreUas.some((u) => u && ua.toLowerCase().includes(u.toLowerCase()))) {
          return json({ ok: true, skipped: 'ignored_ua' }, 200, request, env);
        }

        const device = parseDevice(ua);
        const { day, hour, ts } = getBeijingNow();
        const visitorId = await sha256Short(`${ip}|${ua}|${day}`);

        const [rawSummary, recent, onlineMap] = await Promise.all([
          kv.get('summary', 'json'),
          kv.get('recent', 'json'),
          kv.get('online', 'json')
        ]);

        const summary = { ...defaultSummary(), ...(rawSummary || {}) };
        if (!Array.isArray(summary.hourly) || summary.hourly.length !== 24) {
          summary.hourly = Array(24).fill(0);
        }
        const logs = Array.isArray(recent) ? recent : [];
        const online = onlineMap && typeof onlineMap === 'object' ? onlineMap : {};

        summary.totalPv = (summary.totalPv || 0) + 1;
        summary.hourly[hour] = (summary.hourly[hour] || 0) + 1;

        if (!summary.daily[day]) summary.daily[day] = { pv: 0, uvs: [] };
        summary.daily[day].pv += 1;
        if (!summary.daily[day].uvs.includes(visitorId) && summary.daily[day].uvs.length < 2000) {
          summary.daily[day].uvs.push(visitorId);
        }

        const days = Object.keys(summary.daily).sort();
        while (days.length > 60) {
          delete summary.daily[days.shift()];
        }

        summary.pages[path] = (summary.pages[path] || 0) + 1;
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

        const nowMs = Date.now();
        online[visitorId] = nowMs;
        for (const [vid, seen] of Object.entries(online)) {
          if (nowMs - seen > ONLINE_WINDOW_MS) delete online[vid];
        }

        const logId = `v_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        logs.unshift({
          id: logId,
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
        if (logs.length > MAX_RECENT_LOGS) logs.length = MAX_RECENT_LOGS;

        await Promise.all([
          kv.put('summary', JSON.stringify(summary)),
          kv.put('recent', JSON.stringify(logs)),
          kv.put('online', JSON.stringify(online))
        ]);

        return json({ ok: true, id: logId }, 200, request, env);
      } catch (err) {
        return json({ ok: false, error: err.message }, 400, request, env);
      }
    }

    // ------------------------------------------------------------------
    // 2. Public Reading Engagement Beacon: POST /api/engage
    // ------------------------------------------------------------------
    if (url.pathname === '/api/engage' && request.method === 'POST') {
      try {
        const body = await request.json();
        const path = String(body.path || '').slice(0, 140);
        const dwellSec = Math.min(3600, Math.max(0, Math.round(Number(body.dwellSec || 0))));
        const maxScroll = Math.min(100, Math.max(0, Math.round(Number(body.maxScroll || 0))));
        if (!path || dwellSec < 2) {
          return json({ ok: true, skipped: 'short' }, 200, request, env);
        }

        const engagement = (await kv.get('engagement', 'json')) || {};
        const prev = engagement[path] || { sessions: 0, totalDwellSec: 0, totalScroll: 0, completed: 0 };
        prev.sessions += 1;
        prev.totalDwellSec += dwellSec;
        prev.totalScroll += maxScroll;
        if (maxScroll >= 80) prev.completed += 1;
        engagement[path] = prev;

        await kv.put('engagement', JSON.stringify(engagement));
        return json({ ok: true }, 200, request, env);
      } catch (err) {
        return json({ ok: false, error: err.message }, 400, request, env);
      }
    }

    // ------------------------------------------------------------------
    // 3. Authenticated Admin Stats: GET /api/stats?range=7d|30d|today|all
    // ------------------------------------------------------------------
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized: 管理员密码错误' }, 401, request, env);
      }

      const range = url.searchParams.get('range') || '7d';
      const [rawSummary, rawRecent, onlineMap, engagement, likes, comments, settings] = await Promise.all([
        kv.get('summary', 'json'),
        kv.get('recent', 'json'),
        kv.get('online', 'json'),
        kv.get('engagement', 'json'),
        kv.get('likes', 'json'),
        kv.get('comments', 'json'),
        getSettings(kv)
      ]);

      const summary = { ...defaultSummary(), ...(rawSummary || {}) };
      const recent = (Array.isArray(rawRecent) ? rawRecent : []).map((r, i) => ({
        id: r.id || `legacy_${i}_${r.ts || ''}`,
        ...r
      }));

      const { day: today } = getBeijingNow();
      const todayStat = summary.daily[today] || { pv: 0, uvs: [] };

      const daysCount = range === '30d' ? 30 : range === 'today' ? 1 : 7;
      const dailySeries = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000);
        const key = getBeijingNow(d).day;
        const entry = summary.daily[key] || { pv: 0, uvs: [] };
        dailySeries.push({ day: key.slice(5), fullDay: key, pv: entry.pv, uv: entry.uvs.length });
      }

      const allUvSet = new Set();
      for (const entry of Object.values(summary.daily || {})) {
        for (const id of entry.uvs || []) allUvSet.add(id);
      }

      // Active online visitors within 5 minutes
      const nowMs = Date.now();
      let onlineCount = 0;
      if (onlineMap && typeof onlineMap === 'object') {
        for (const seen of Object.values(onlineMap)) {
          if (nowMs - seen <= ONLINE_WINDOW_MS) onlineCount += 1;
        }
      }

      // Likes summary per slug
      const likesSummary = {};
      if (likes && typeof likes === 'object') {
        for (const [slug, voters] of Object.entries(likes)) {
          likesSummary[slug] = Array.isArray(voters) ? voters.length : Number(voters || 0);
        }
      }

      // Comments counts
      const commentList = Array.isArray(comments) ? comments : [];
      const pendingComments = commentList.filter((c) => c.status === 'pending').length;

      // Range-scoped KPIs (for today / 7d / 30d / all)
      let rangePv = summary.totalPv || 0;
      let rangeUv = allUvSet.size;
      if (range === 'today') {
        rangePv = todayStat.pv;
        rangeUv = todayStat.uvs.length;
      } else if (range === '7d' || range === '30d') {
        const uvSet = new Set();
        let pvSum = 0;
        for (const row of dailySeries) {
          const entry = summary.daily[row.fullDay];
          if (entry) {
            pvSum += entry.pv || 0;
            for (const id of entry.uvs || []) uvSet.add(id);
          }
        }
        rangePv = pvSum;
        rangeUv = uvSet.size;
      }

      return json(
        {
          ok: true,
          mode: 'cloud',
          range,
          totalPv: summary.totalPv || 0,
          totalUv: allUvSet.size,
          rangePv,
          rangeUv,
          todayPv: todayStat.pv,
          todayUv: todayStat.uvs.length,
          onlineCount,
          dailySeries,
          hourlySeries: Array.isArray(summary.hourly) && summary.hourly.length === 24 ? summary.hourly : Array(24).fill(0),
          pages: summary.pages || {},
          countries: summary.countries || {},
          devices: summary.devices || {},
          referrers: summary.referrers || {},
          engagement: engagement || {},
          likes: likesSummary,
          commentTotal: commentList.length,
          pendingComments,
          settings,
          recent
        },
        200,
        request,
        env
      );
    }

    // ------------------------------------------------------------------
    // 4. Delete Single / Selected Visit Logs: POST /api/logs/delete
    // ------------------------------------------------------------------
    if (url.pathname === '/api/logs/delete' && request.method === 'POST') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
      }
      const body = await request.json().catch(() => ({}));
      const ids = Array.isArray(body.ids) ? body.ids : [];
      if (!ids.length) return json({ ok: false, error: '未提供要删除的日志 ID' }, 400, request, env);

      const idSet = new Set(ids);
      const [rawSummary, rawRecent] = await Promise.all([
        kv.get('summary', 'json'),
        kv.get('recent', 'json')
      ]);
      const summary = { ...defaultSummary(), ...(rawSummary || {}) };
      const recent = (Array.isArray(rawRecent) ? rawRecent : []).map((r, i) => ({
        id: r.id || `legacy_${i}_${r.ts || ''}`,
        ...r
      }));

      const removed = [];
      const kept = [];
      for (const row of recent) {
        if (idSet.has(row.id)) removed.push(row);
        else kept.push(row);
      }

      // Decrement summary counters cleanly for removed logs
      for (const r of removed) {
        summary.totalPv = Math.max(0, (summary.totalPv || 0) - 1);
        if (r.path && summary.pages[r.path]) {
          summary.pages[r.path] = Math.max(0, summary.pages[r.path] - 1);
          if (summary.pages[r.path] === 0) delete summary.pages[r.path];
        }
        if (r.region && summary.countries[r.region]) {
          summary.countries[r.region] = Math.max(0, summary.countries[r.region] - 1);
          if (summary.countries[r.region] === 0) delete summary.countries[r.region];
        }
        if (r.referrer && summary.referrers[r.referrer]) {
          summary.referrers[r.referrer] = Math.max(0, summary.referrers[r.referrer] - 1);
          if (summary.referrers[r.referrer] === 0) delete summary.referrers[r.referrer];
        }
        if (r.day && summary.daily[r.day]) {
          summary.daily[r.day].pv = Math.max(0, (summary.daily[r.day].pv || 0) - 1);
        }
      }

      await Promise.all([
        kv.put('summary', JSON.stringify(summary)),
        kv.put('recent', JSON.stringify(kept)),
        appendAudit(kv, '删除访客记录', `移除 ${removed.length} 条记录（${removed.slice(0, 3).map((x) => x.path).join(', ')}）`)
      ]);

      return json({ ok: true, deleted: removed.length }, 200, request, env);
    }

    // ------------------------------------------------------------------
    // 5. Reset All Stats: DELETE /api/clear
    // ------------------------------------------------------------------
    if (url.pathname === '/api/clear' && request.method === 'DELETE') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
      }
      await Promise.all([
        kv.delete('summary'),
        kv.delete('recent'),
        kv.delete('online'),
        kv.delete('engagement'),
        appendAudit(kv, '清空访客统计', '已重置全站 PV/UV、趋势与明细日志')
      ]);
      return json({ ok: true }, 200, request, env);
    }

    // ------------------------------------------------------------------
    // 6. Server-side Settings (Ignore rules & Comment moderation): POST /api/settings
    // ------------------------------------------------------------------
    if (url.pathname === '/api/settings' && request.method === 'POST') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
      }
      const body = await request.json().catch(() => ({}));
      const cur = await getSettings(kv);
      const next = {
        ignorePaths: Array.isArray(body.ignorePaths)
          ? body.ignorePaths.map((s) => String(s).trim()).filter(Boolean).slice(0, 50)
          : cur.ignorePaths,
        ignoreUas: Array.isArray(body.ignoreUas)
          ? body.ignoreUas.map((s) => String(s).trim()).filter(Boolean).slice(0, 50)
          : cur.ignoreUas,
        commentModeration:
          body.commentModeration === 'manual' || body.commentModeration === 'auto'
            ? body.commentModeration
            : cur.commentModeration,
        bannedVisitors: Array.isArray(body.bannedVisitors)
          ? body.bannedVisitors.map((s) => String(s).trim()).filter(Boolean).slice(0, 200)
          : cur.bannedVisitors
      };
      await Promise.all([
        kv.put('settings', JSON.stringify(next)),
        appendAudit(kv, '更新系统规则', `审核模式=${next.commentModeration}，屏蔽路径 ${next.ignorePaths.length} 条`)
      ]);
      return json({ ok: true, settings: next }, 200, request, env);
    }

    // ------------------------------------------------------------------
    // 7. Article Likes: GET & POST /api/likes
    // ------------------------------------------------------------------
    if (url.pathname === '/api/likes') {
      const { ua, ip } = getVisitorMeta(request);
      const voterId = await sha256Short(`${ip}|${ua}|like`);
      const likes = (await kv.get('likes', 'json')) || {};

      if (request.method === 'GET') {
        const slug = url.searchParams.get('slug') || '';
        if (slug) {
          const arr = Array.isArray(likes[slug]) ? likes[slug] : [];
          return json({ ok: true, slug, count: arr.length, liked: arr.includes(voterId) }, 200, request, env);
        }
        const counts = {};
        for (const [k, v] of Object.entries(likes)) {
          counts[k] = Array.isArray(v) ? v.length : Number(v || 0);
        }
        return json({ ok: true, counts }, 200, request, env);
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const slug = String(body.slug || '').trim().slice(0, 100);
        if (!slug) return json({ ok: false, error: 'Missing slug' }, 400, request, env);
        const arr = Array.isArray(likes[slug]) ? likes[slug] : [];
        const idx = arr.indexOf(voterId);
        let liked = false;
        if (idx >= 0) {
          arr.splice(idx, 1);
          liked = false;
        } else {
          arr.push(voterId);
          liked = true;
        }
        likes[slug] = arr;
        await kv.put('likes', JSON.stringify(likes));
        return json({ ok: true, slug, count: arr.length, liked }, 200, request, env);
      }
    }

    // ------------------------------------------------------------------
    // 8. Comments & Guestbook: GET / POST / PATCH / DELETE /api/comments
    // ------------------------------------------------------------------
    if (url.pathname === '/api/comments') {
      const comments = (await kv.get('comments', 'json')) || [];

      if (request.method === 'GET') {
        const target = url.searchParams.get('target') || '';
        const scope = url.searchParams.get('scope') || '';
        if (scope === 'all') {
          if (!isAuthorized(request, env)) {
            return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
          }
          const settings = await getSettings(kv);
          return json({ ok: true, comments, settings }, 200, request, env);
        }
        const visible = comments
          .filter((c) => c.status === 'approved' && (!target || c.target === target))
          .map(({ email, ...safe }) => safe);
        return json({ ok: true, comments: visible }, 200, request, env);
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        // Honeypot check
        if (body.website) {
          return json({ ok: true, skipped: 'spam' }, 200, request, env);
        }
        const target = String(body.target || 'guestbook').trim().slice(0, 120);
        const author = String(body.author || '').trim().slice(0, 40);
        const email = String(body.email || '').trim().slice(0, 80);
        const content = String(body.content || '').trim().slice(0, 1200);
        const replyTo = String(body.replyTo || '').trim().slice(0, 60);

        if (!author || !content) {
          return json({ ok: false, error: '请填写昵称与留言内容' }, 400, request, env);
        }

        const { ua, ip, regionKey } = getVisitorMeta(request);
        const visitorHash = await sha256Short(`${ip}|comment`);
        const isOwner = isAuthorized(request, env);
        const settings = await getSettings(kv);

        if (!isOwner && settings.bannedVisitors.includes(visitorHash)) {
          return json({ ok: false, error: '当前访客已被限制发言' }, 403, request, env);
        }

        const { ts } = getBeijingNow();
        const item = {
          id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          target,
          author: isOwner ? body.author || 'Gavin' : author,
          email,
          content,
          replyTo,
          isOwner,
          visitorId: visitorHash,
          region: isOwner ? '站长' : regionKey,
          ts,
          status: isOwner || settings.commentModeration === 'auto' ? 'approved' : 'pending',
          ownerReply: ''
        };

        comments.unshift(item);
        if (comments.length > MAX_COMMENTS) comments.length = MAX_COMMENTS;
        await kv.put('comments', JSON.stringify(comments));
        if (isOwner) {
          await appendAudit(kv, '站长发表回复', `目标：${target}`);
        }

        const { email: _hidden, ...safeItem } = item;
        return json({ ok: true, comment: safeItem, pending: item.status === 'pending' }, 200, request, env);
      }

      if (request.method === 'PATCH') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
        }
        const body = await request.json().catch(() => ({}));
        const id = String(body.id || '');
        const item = comments.find((c) => c.id === id);
        if (!item) return json({ ok: false, error: '未找到该留言' }, 404, request, env);

        if (body.status && ['approved', 'pending', 'hidden'].includes(body.status)) {
          item.status = body.status;
        }
        if (typeof body.ownerReply === 'string') {
          item.ownerReply = body.ownerReply.trim().slice(0, 800);
          item.ownerReplyTs = getBeijingNow().ts;
        }
        if (body.banVisitor && item.visitorId) {
          const settings = await getSettings(kv);
          if (!settings.bannedVisitors.includes(item.visitorId)) {
            settings.bannedVisitors.push(item.visitorId);
            await kv.put('settings', JSON.stringify(settings));
          }
          item.status = 'hidden';
        }

        await Promise.all([
          kv.put('comments', JSON.stringify(comments)),
          appendAudit(kv, '审核/处理留言', `ID=${id} 状态=${item.status}${body.banVisitor ? '（已拉黑）' : ''}`)
        ]);
        return json({ ok: true, comment: item }, 200, request, env);
      }

      if (request.method === 'DELETE') {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
        }
        const id = url.searchParams.get('id') || '';
        const idx = comments.findIndex((c) => c.id === id);
        if (idx < 0) return json({ ok: false, error: '未找到该留言' }, 404, request, env);
        const [removed] = comments.splice(idx, 1);
        await Promise.all([
          kv.put('comments', JSON.stringify(comments)),
          appendAudit(kv, '删除留言', `删除 ${removed.author} 在 ${removed.target} 的留言`)
        ]);
        return json({ ok: true }, 200, request, env);
      }
    }

    // ------------------------------------------------------------------
    // 9. Audit Logs: GET & POST /api/audit
    // ------------------------------------------------------------------
    if (url.pathname === '/api/audit') {
      if (!isAuthorized(request, env)) {
        return json({ ok: false, error: 'Unauthorized' }, 401, request, env);
      }
      if (request.method === 'GET') {
        const logs = (await kv.get('audit', 'json')) || [];
        return json({ ok: true, logs }, 200, request, env);
      }
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const logs = await appendAudit(kv, body.action || '管理操作', body.detail || '');
        return json({ ok: true, logs }, 200, request, env);
      }
    }

    return json({ ok: false, error: 'Not found' }, 404, request, env);
  }
};
