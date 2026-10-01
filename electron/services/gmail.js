// Gmail sent-folder polling with a desktop OAuth2 loopback flow (PKCE).
// Needs a Google Cloud OAuth client of type "Desktop app" with the Gmail API
// enabled. Only the read-only scope is requested.

const http = require('http');
const crypto = require('crypto');

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GENERIC_DOMAINS = new Set(['gmail', 'googlemail', 'outlook', 'hotmail', 'yahoo', 'icloud', 'gmx', 'web', 'proton', 'protonmail', 'live', 'aol', 'mail']);

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function authorize({ clientId, clientSecret }, openExternal) {
  if (!clientId || !clientSecret) return Promise.reject(new Error('Enter your OAuth client ID and secret first'));
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid state'); return; }
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<body style="font-family:sans-serif;background:#111;color:#eee;padding:40px">
        <h2>${code ? '🦉 StudyForce is connected to Gmail.' : 'Authorization failed: ' + (err || 'unknown')}</h2>
        <p>You can close this tab.</p></body>`);
      server.close();
      clearTimeout(timer);
      if (!code) { reject(new Error(err || 'Authorization was cancelled')); return; }
      try {
        const tokens = await tokenRequest({
          code, client_id: clientId, client_secret: clientSecret, code_verifier: verifier,
          redirect_uri: redirectUri, grant_type: 'authorization_code'
        });
        if (!tokens.refresh_token) throw new Error('Google did not return a refresh token; remove the app from your Google account permissions and try again');
        const profile = await apiGet(tokens.access_token, '/profile');
        resolve({ refreshToken: tokens.refresh_token, email: profile.emailAddress });
      } catch (e) { reject(e); }
    });
    let redirectUri;
    const timer = setTimeout(() => { server.close(); reject(new Error('Timed out waiting for Google sign-in')); }, 5 * 60 * 1000);
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const params = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: SCOPE,
        access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state
      });
      openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
  });
}

async function tokenRequest(body) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'Token request failed');
  return json;
}

let cached = { token: null, expires: 0, refresh: null };
async function accessToken({ clientId, clientSecret, refreshToken }) {
  if (cached.token && cached.refresh === refreshToken && cached.expires > Date.now() + 60000) return cached.token;
  const json = await tokenRequest({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000, refresh: refreshToken };
  return cached.token;
}

async function apiGet(token, pathAndQuery) {
  const res = await fetch(API + pathAndQuery, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error((json.error && json.error.message) || `Gmail API error ${res.status}`);
  return json;
}

// "Acme Careers <jobs@acme.io>" → "Acme"
function companyFromRecipient(to = '') {
  const first = to.split(',')[0].trim();
  const m = first.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
  const name = m ? m[1].trim() : '';
  const email = (m ? m[2] : first).trim();
  const domain = (email.split('@')[1] || '').toLowerCase();
  const parts = domain.split('.');
  const core = parts.length > 2 && ['co', 'com', 'ac'].includes(parts[parts.length - 2]) ? parts[parts.length - 3] : parts[parts.length - 2];
  if (core && !GENERIC_DOMAINS.has(core)) return core.charAt(0).toUpperCase() + core.slice(1);
  return name.replace(/\b(careers?|jobs?|recruiting|hr|talent)\b/gi, '').trim() || email;
}

// Returns sent messages matching the query that look like applications.
async function pollSent(gmail) {
  const token = await accessToken(gmail);
  const list = await apiGet(token, `/messages?maxResults=50&q=${encodeURIComponent(gmail.query)}`);
  const out = [];
  for (const { id } of list.messages || []) {
    const msg = await apiGet(token, `/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject`);
    const header = (n) => ((msg.payload.headers || []).find((h) => h.name.toLowerCase() === n) || {}).value || '';
    if (!(msg.labelIds || []).includes('SENT')) continue;
    const subject = header('subject');
    out.push({
      messageId: id,
      subject,
      company: companyFromRecipient(header('to')),
      role: (subject.match(/(?:application|applying|bewerbung)\s*(?:for|als|as)?\s*[:\-–]?\s*(.+)/i) || [])[1] || '',
      sentAt: Number(msg.internalDate)
    });
  }
  return out;
}

module.exports = { authorize, pollSent, companyFromRecipient };
