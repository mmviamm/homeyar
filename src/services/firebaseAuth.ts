import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Configure Workspace OAuth scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory. MUST NOT store in localStorage/sessionStorage.
let cachedAccessToken: string | null = null;
let customUser: { displayName: string | null; email: string | null; photoURL: string | null } | null = null;

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else if (customUser && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(customUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * ورود مستقیم با Google Identity Services (GSI)
 * این متد از دامنه مسدود یا غیرفعال firebaseapp.com استفاده نمی‌کند،
 * بلکه مستقیماً با accounts.google.com ارتباط برقرار کرده و توکن را دریافت می‌کند.
 */
export const signInWithGoogleIdentity = async (): Promise<{ user: any; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services script not loaded.'));
      return;
    }

    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(`Google OAuth error: ${tokenResponse.error_description || tokenResponse.error}`));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token returned from Google'));
            return;
          }

          cachedAccessToken = accessToken;

          // دریافت مشخصات کاربر از گوگل
          let userInfo = { displayName: 'کاربر گوگل', email: '', photoURL: null };
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const u = await userRes.json();
              userInfo = {
                displayName: u.name || u.email,
                email: u.email,
                photoURL: u.picture || null,
              };
            }
          } catch (e) {
            console.warn('Could not fetch userinfo:', e);
          }

          customUser = userInfo;
          resolve({ user: userInfo, accessToken });
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * متد ورود هوشمند: ابتدا GSI بدون وابستگی به firebaseapp.com را امتحان می‌کند،
 * و در صورت عدم وجود اسکریپت، به Firebase Popup سوییچ می‌کند.
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    // ۱. بررسی اولویت Google Identity Services (عدم نیاز به firebaseapp.com)
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const gsiResult = await signInWithGoogleIdentity();
        return gsiResult;
      } catch (gsiErr: any) {
        console.warn('GSI flow encountered an error, falling back to Firebase popup:', gsiErr);
        // اگر کاربر پاپ‌آپ را بست، متوقف شو
        if (gsiErr?.message?.includes('popup_closed') || gsiErr?.message?.includes('user_cancel')) {
          throw gsiErr;
        }
      }
    }

    // ۲. فالبک: استفاده از Firebase Auth
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Sheets access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error?.code === 'auth/unauthorized-domain') {
      const err = new Error('دامنه فعلی در پروژه فایربیس مجاز (Authorized) نشده است.');
      (err as any).code = 'auth/unauthorized-domain';
      throw err;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const setManualAccessToken = async (token: string): Promise<any> => {
  const trimmed = token.trim();
  if (!trimmed) throw new Error('توکن نمی‌تواند خالی باشد.');

  // اعتبارسنجی توکن با فراخوانی API گوگل
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${trimmed}` },
  });

  if (!res.ok) {
    throw new Error('توکن وارد شده نامعتبر یا منقضی شده است.');
  }

  const u = await res.json();
  const userInfo = {
    displayName: u.name || u.email,
    email: u.email,
    photoURL: u.picture || null,
  };

  cachedAccessToken = trimmed;
  customUser = userInfo;
  return userInfo;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore signout error if signed in via GSI
  }
  cachedAccessToken = null;
  customUser = null;
};
