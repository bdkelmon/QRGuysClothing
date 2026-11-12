'use strict';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function httpsOrigin(value, name) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    return url.origin;
  } catch { throw new HttpError(503, `${name} is not configured`); }
}

function configuration(env = process.env, { admin = true } = {}) {
  if (env.QRG_SERVICES_READY !== 'true') throw new HttpError(503, 'Apparel services are not enabled');
  const appOrigin = httpsOrigin(env.QRG_APP_ORIGIN, 'App origin');
  const supabaseUrl = httpsOrigin(env.QRG_SUPABASE_URL, 'Account service');
  if (!env.QRG_SUPABASE_ANON_KEY || (admin && !env.QRG_SUPABASE_SERVICE_ROLE_KEY)) throw new HttpError(503, 'Account service is not configured');
  // Never silently inherit old ThemeQR credentials, domains, or environment names.
  if (/themeqr/i.test(appOrigin + supabaseUrl)) throw new HttpError(503, 'Independent QR Guys services are required');
  let qrBaseUrl;
  try {
    qrBaseUrl = new URL(env.QRG_QR_BASE_URL || '/scan.html', appOrigin);
    if (qrBaseUrl.origin !== appOrigin || qrBaseUrl.search || qrBaseUrl.hash) throw new Error();
  } catch { throw new HttpError(503, 'QR destination is not configured'); }
  return { appOrigin, supabaseUrl, supabaseAnonKey: env.QRG_SUPABASE_ANON_KEY,
    serviceKey: env.QRG_SUPABASE_SERVICE_ROLE_KEY, qrBaseUrl: qrBaseUrl.href,
    checkoutEnabled: env.QRG_CHECKOUT_ENABLED === 'true' };
}

function publicConfiguration(config) {
  return { appOrigin: config.appOrigin, supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey, qrBaseUrl: config.qrBaseUrl,
    loginPath: '/login.html', features: { videoUpload: false, imageUpload: false, checkout: false } };
}

function serviceClient(config, fetchImpl = fetch) {
  async function request(path, { method = 'GET', body, bearer, headers = {} } = {}) {
    const response = await fetchImpl(config.supabaseUrl + path, {
      method, signal: AbortSignal.timeout(8000),
      headers: { apikey: config.serviceKey, Authorization: `Bearer ${bearer || config.serviceKey}`, 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new HttpError(response.status === 401 ? 401 : 502, 'Account service request failed');
    if (response.status === 204) return null;
    return response.json();
  }
  return { request, rpc: (name, body) => request('/rest/v1/rpc/' + name, { method: 'POST', body }) };
}

async function authenticate(req, client, roles) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!match) throw new HttpError(401, 'Sign in is required');
  const user = await client.request('/auth/v1/user', { bearer: match[1] });
  if (!user?.id) throw new HttpError(401, 'Sign in is required');
  if (roles && !roles.includes(user.app_metadata?.role)) throw new HttpError(403, 'Staff access is required');
  return user;
}

function identifier(value, label = 'Identifier') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new HttpError(400, `${label} is invalid`);
  return value;
}

function handler(method, action, overrides = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== method) { res.setHeader('Allow', method); return res.status(405).json({ error: 'Method not allowed' }); }
    try {
      const env = overrides.env || process.env;
      const config = configuration(env, { admin: overrides.admin !== false });
      if (req.headers.origin && req.headers.origin !== config.appOrigin) throw new HttpError(403, 'Origin is not allowed');
      const client = overrides.client || serviceClient(config, overrides.fetch);
      const result = await action({ req, config, client, env, ...overrides });
      return res.status(200).json(result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      // Do not expose provider responses, credentials, activation codes, or customer data.
      return res.status(status).json({ error: error instanceof HttpError ? error.message : 'The request could not be completed' });
    }
  };
}

module.exports = { HttpError, configuration, publicConfiguration, serviceClient, authenticate, identifier, handler };
