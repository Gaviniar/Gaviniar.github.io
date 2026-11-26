/**
 * Vercel Edge Proxy for Gavin's Blog Analytics
 * - Mainland China friendly custom domain (e.g. stat.blog.gavinli.top) via Aliyun DNS CNAME
 * - Forwards real visitor IP, country & city from Vercel edge headers to Cloudflare Worker
 */

export const config = {
  runtime: 'edge'
};

const UPSTREAM = 'https://blog-analytics.traplijun.workers.dev';

function safeDecode(val = '') {
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

function buildCorsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}

export default async function handler(request) {
  const cors = buildCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const incomingUrl = new URL(request.url);
  const rawPath = incomingUrl.searchParams.get('__path') || '';
  const targetPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  // Forward any remaining real query parameters (excluding internal __path)
  const forwardParams = new URLSearchParams(incomingUrl.searchParams);
  forwardParams.delete('__path');
  const qs = forwardParams.toString();
  const upstreamUrl = `${UPSTREAM}${targetPath}${qs ? `?${qs}` : ''}`;

  // Extract real visitor geo & IP from Vercel edge headers
  const country = request.headers.get('x-vercel-ip-country') || '';
  const city = safeDecode(request.headers.get('x-vercel-ip-city') || '');
  const region = safeDecode(request.headers.get('x-vercel-ip-country-region') || '');
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const visitorIp = forwardedFor.split(',')[0].trim();

  const headers = new Headers();
  const passThrough = ['content-type', 'authorization', 'user-agent', 'origin', 'referer'];
  for (const key of passThrough) {
    const val = request.headers.get(key);
    if (val) headers.set(key, val);
  }
  if (country) headers.set('x-visitor-country', country);
  if (city || region) headers.set('x-visitor-city', city || region);
  if (visitorIp) headers.set('x-visitor-ip', visitorIp);

  const init = {
    method: request.method,
    headers
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, init);
    const resHeaders = new Headers(upstreamRes.headers);
    for (const [k, v] of Object.entries(cors)) {
      resHeaders.set(k, v);
    }
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: `Proxy upstream error: ${err.message}` }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...cors
        }
      }
    );
  }
}
