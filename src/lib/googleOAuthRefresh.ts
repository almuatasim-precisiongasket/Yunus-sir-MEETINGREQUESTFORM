import { getGoogleCredentials, saveGoogleCredentials, GoogleCredentials } from './db';

/**
 * Checks if the permanent Google connection is configured and silently refreshes the access token if needed.
 * Returns the active access token or null if not configured/failed.
 */
export async function getOrRefreshGoogleToken(): Promise<string | null> {
  const creds = await getGoogleCredentials();
  if (!creds || !creds.clientId || !creds.clientSecret || !creds.refreshToken) {
    return null; // Not set up for permanent connection
  }

  const now = Date.now();
  // If we have a cached token that is valid for at least 2 minutes, return it immediately
  if (creds.accessToken && creds.tokenExpiry && creds.tokenExpiry > now + 120 * 1000) {
    // Keep local storage in sync
    localStorage.setItem('google_auth_token', creds.accessToken);
    localStorage.setItem('google_auth_token_expiry', creds.tokenExpiry.toString());
    return creds.accessToken;
  }

  // Refresh token is required, call Google OAuth token exchange
  try {
    const res = await fetch('/api/google/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to silently refresh Google OAuth token:', errorText);
      return null;
    }

    const data = await res.json();
    if (!data.access_token) {
      console.error('Exchange response did not return an access token:', data);
      return null;
    }

    const expires_in = data.expires_in || 3600;
    const tokenExpiry = Date.now() + expires_in * 1000;
    const updatedCreds: GoogleCredentials = {
      ...creds,
      accessToken: data.access_token,
      tokenExpiry
    };

    // Save updated credentials back to Firestore and LocalStorage
    await saveGoogleCredentials(updatedCreds);

    // Write to standard local storage keys so existing code picks it up seamlessly
    localStorage.setItem('google_auth_token', data.access_token);
    localStorage.setItem('google_auth_token_expiry', tokenExpiry.toString());

    console.log('Google OAuth token silently refreshed successfully.');
    return data.access_token;
  } catch (err) {
    console.error('Error occurred during Google OAuth silent token refresh:', err);
    return null;
  }
}

/**
 * Exchanges a one-time Google authorization code for a persistent refresh token.
 */
export async function exchangeCodeForRefreshToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<GoogleCredentials | null> {
  try {
    const res = await fetch('/api/google/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Google OAuth code exchange failed: ${errTxt}`);
    }

    const data = await res.json();
    if (!data.refresh_token) {
      throw new Error('Google did not return a refresh token. Make sure you select an account you have not linked yet, or trigger full consent parameters.');
    }

    const expires_in = data.expires_in || 3600;
    const tokenExpiry = Date.now() + expires_in * 1000;

    const creds: GoogleCredentials = {
      clientId,
      clientSecret,
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      tokenExpiry
    };

    await saveGoogleCredentials(creds);

    // Save to local storage for instant pickup
    localStorage.setItem('google_auth_token', data.access_token);
    localStorage.setItem('google_auth_token_expiry', tokenExpiry.toString());

    return creds;
  } catch (err) {
    console.error('Error exchanging authorization code:', err);
    throw err;
  }
}
