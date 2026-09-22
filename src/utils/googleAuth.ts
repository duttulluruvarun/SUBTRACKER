/**
 * Google OAuth 2.0 Identity Services Utility
 * Uses Google Identity Services (GIS) with prompt: 'select_account'
 * to show all logged-in Google accounts for the user to choose from.
 */

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

/**
 * Parses JWT payload (e.g. from Google credential response) safely in browser
 */
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse JWT token', err);
    return null;
  }
}

/**
 * Triggers Google OAuth 2.0 Token Client with prompt: 'select_account'
 * so Google always shows all accounts logged in on the user's browser.
 */
export function requestGoogleAccountSelect({
  clientId,
  onSuccess,
  onError,
}: {
  clientId: string;
  onSuccess: (profile: GoogleUserProfile) => void;
  onError: (error: string) => void;
}) {
  if (typeof window === 'undefined') {
    onError('Window is not available');
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    onError('Google Identity Services SDK not loaded yet. Please check your internet connection.');
    return;
  }

  if (!clientId || clientId.trim() === '') {
    onError('Please provide a valid Google OAuth Client ID');
    return;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          onError(tokenResponse.error);
          return;
        }

        if (!tokenResponse.access_token) {
          onError('No access token returned from Google');
          return;
        }

        try {
          // Fetch Google User Profile using Access Token
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });

          if (!res.ok) {
            throw new Error(`Google UserInfo API returned status ${res.status}`);
          }

          const userInfo = await res.json();
          onSuccess({
            id: userInfo.sub,
            name: userInfo.name || userInfo.email.split('@')[0],
            email: userInfo.email,
            picture: userInfo.picture,
            givenName: userInfo.given_name,
            familyName: userInfo.family_name,
          });
        } catch (fetchErr: any) {
          onError(fetchErr.message || 'Failed to retrieve profile from Google');
        }
      },
      error_callback: (err: any) => {
        onError(err?.message || 'Google Sign-In popup was closed or cancelled');
      },
    });

    // Request access token with prompt: 'select_account' to force Google account chooser
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (err: any) {
    onError(err.message || 'Error initializing Google OAuth Client');
  }
}
