import { initializeApp, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Enable Google Calendar and Gmail scopes
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');

// Config options so it prompts for account selection and permissions consent
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_auth_token');
let tokenExpiry: number | null = parseInt(localStorage.getItem('google_auth_token_expiry') || '0', 10);

if (cachedAccessToken && tokenExpiry && Date.now() > tokenExpiry) {
  cachedAccessToken = null;
  localStorage.removeItem('google_auth_token');
  localStorage.removeItem('google_auth_token_expiry');
}

// Initialize auth state listener. Call this on app load or when needed.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in under Firebase but accessToken missing in this session, need to re-authenticate or clear.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Token is valid for 1 hour (3600 seconds)
    tokenExpiry = Date.now() + 3600 * 1000;
    localStorage.setItem('google_auth_token', cachedAccessToken);
    localStorage.setItem('google_auth_token_expiry', tokenExpiry.toString());
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  tokenExpiry = null;
  localStorage.removeItem('google_auth_token');
  localStorage.removeItem('google_auth_token_expiry');
};
