import firebaseConfig from '../../firebase-applet-config.json';

// Configure Workspace OAuth scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

// Cache the access token in memory. MUST NOT store in localStorage/sessionStorage.
let cachedAccessToken: string | null = null;
let customUser: { displayName: string | null; email: string | null; photoURL: string | null } | null = null;

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // توکن فقط در حافظه نگه‌داری می‌شود؛ پس در شروع برنامه هیچ نشستی وجود ندارد مگر اینکه
  // قبلاً در همین اجرا وارد شده باشیم.
  if (customUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(customUser, cachedAccessToken);
  } else {
    cachedAccessToken = null;
    if (onAuthFailure) onAuthFailure();
  }
  return () => {};
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
 * ورود با حساب گوگل از طریق Google Identity Services.
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    return await signInWithGoogleIdentity();
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
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
  cachedAccessToken = null;
  customUser = null;
};
