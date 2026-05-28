/**
 * Vercel Serverless Function: Secure Google OAuth Token Proxy
 * Proxies Google OAuth authorization code-exchanges and token refresh requests server-side
 * to prevent CORS restrictions and shield the client secret.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { client_id, client_secret, code, refresh_token, redirect_uri, grant_type } = req.body || {};

    // Prioritize secure environment variables configured in hosting console
    const finalClientId = process.env.GOOGLE_CLIENT_ID || client_id;
    const finalClientSecret = process.env.GOOGLE_CLIENT_SECRET || client_secret;

    if (!finalClientId || !finalClientSecret) {
      return res.status(400).json({ error: 'Missing client_id or client_secret credentials.' });
    }

    const payload = {
      client_id: finalClientId,
      client_secret: finalClientSecret,
      grant_type
    };

    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required authorization_code parameters.' });
      }
      payload.code = code;
      payload.redirect_uri = redirect_uri;
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({ error: 'Missing required refresh_token parameter.' });
      }
      payload.refresh_token = refresh_token;
    } else {
      return res.status(400).json({ error: 'Unsupported grant_type.' });
    }

    const googleRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload).toString()
    });

    const data = await googleRes.json();
    if (!googleRes.ok) {
      return res.status(googleRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error in Vercel OAuth Serverless Function:', err);
    return res.status(500).json({ error: 'Internal server error during OAuth proxying.' });
  }
}
