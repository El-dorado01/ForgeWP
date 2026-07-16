import React from 'react';

export function stripHtml(text: any): string | null {
  if (typeof text !== 'string') return null;
  return text.replace(/<[^>]*>?/gm, '');
}

export interface WpUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  avatarUrl: string;
  capabilities?: string[];
  emailVerified?: boolean;
}

export interface WpAuthContextType {
  user: WpUser | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  login: (username: string, password: string, redirectUrl?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string, metadata?: Record<string, any>) => Promise<boolean>;
  loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
  emailVerificationEnabled?: boolean;
  verifyEmail: (userId: number, token: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  forgotPassword: (login: string) => Promise<boolean>;
  resetPassword: (login: string, key: string, pass: string) => Promise<boolean>;
}

export const WpAuthContext = React.createContext<WpAuthContextType | null>(null);

declare global {
  interface ForgeWpHydration {
    currentUser?: WpUser | null;
    _compileTime?: boolean;
    loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
    emailVerificationEnabled?: boolean;
    siteSettings?: {
      options?: {
        home?: string;
      };
    };
  }

  interface Window {
    _forgeWpMockUsers?: WpUser[];
    _forgeWpMockRoles?: Record<string, string[]>;
    _forgeWpMockSessions?: any[];
    forgeWpHydration?: ForgeWpHydration;
    _forgeWpCompileTime?: boolean;
    FORGEWP_API_URL?: string;
    FORGEWP_JWT_AUTH?: boolean;
  }
}

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  // @ts-ignore
  import.meta.env?.DEV === true;


// ── STANDALONE HYDRATION FALLBACK STATE ────────────────────────────────────
// Used when components are hydrated outside of WpAuthProvider in monolith mode.
let globalUser: WpUser | null = null;
let globalLoading = false;
// In compile-time SSR (window._forgeWpCompileTime = true) or pure Node.js SSR,
// there is no session to initialize — render "not loading" state immediately.
// In a real browser, this starts as true but the initialization block below
// runs synchronously at module load time and sets it to false before any
// React component renders, so no spinner is ever shown.
let globalInitializing =
  typeof window !== 'undefined' && (window as any)._forgeWpCompileTime !== true;
let globalError: string | null = null;
const globalListeners = new Set<() => void>();


function notifyAuthSubscribers() {
  globalListeners.forEach((fn) => fn());
}

function getStandAloneApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.FORGEWP_API_URL) {
    return window.FORGEWP_API_URL;
  }
  try {
    // @ts-ignore
    const fwUrl = import.meta.env.FORGEWP_API_URL;
    if (fwUrl) return fwUrl;
  } catch (e) {}
  try {
    // @ts-ignore
    const viteUrl = import.meta.env.VITE_WP_API_URL;
    if (viteUrl) return viteUrl;
  } catch (e) {}
  if (typeof window !== 'undefined') {
    const homeUrl = window.forgeWpHydration?.siteSettings?.options?.home;
    if (homeUrl) {
      try {
        return new URL(homeUrl).origin;
      } catch (e) {}
    }
  }
  return '';
}

function isStandaloneJwtEnabled(): boolean {
  if (typeof window !== 'undefined' && window.FORGEWP_JWT_AUTH === true) {
    return true;
  }
  try {
    // @ts-ignore
    const fwJwt = import.meta.env.FORGEWP_JWT_AUTH;
    if (fwJwt === true || fwJwt === 'true') return true;
  } catch (e) {}
  try {
    // @ts-ignore
    const viteJwt = import.meta.env.VITE_WP_JWT_AUTH;
    if (viteJwt === 'true') return true;
  } catch (e) {}
  return false;
}

function decodeStandaloneJwt(token: string): any {
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
  } catch (e) {
    return null;
  }
}

// Initialize standalone state
if (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime !== true && typeof document !== 'undefined') {
  if (IS_DEV) {
    const cached = typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('forgewp_auth_session') : null;
    if (cached) {
      try {
        globalUser = JSON.parse(cached);
      } catch (e) {}
    }
    globalInitializing = false;
  } else {
    if (isStandaloneJwtEnabled()) {
      const token = typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('forgewp_jwt_token') : null;
      if (token) {
        const payload = decodeStandaloneJwt(token);
        if (payload) {
          globalUser = {
            id: payload?.data?.user?.id || 0,
            username: payload?.data?.user?.user_login || '',
            email: payload?.data?.user?.user_email || '',
            displayName: payload?.data?.user?.display_name || '',
            roles: payload?.data?.user?.roles || ['subscriber'],
            avatarUrl: `https://picsum.photos/seed/${payload?.data?.user?.user_login || 'user'}/150/150`,
          };
        }
      }
      globalInitializing = false;
    } else {
      const sessionScript = typeof document !== 'undefined' && typeof document.getElementById === 'function' 
        ? document.getElementById('forgewp-session') 
        : null;
      if (sessionScript) {
        try {
          const parsed = JSON.parse(sessionScript.textContent || '{}');
          globalUser = parsed.user || null;
        } catch (e) {}
      } else if (window.forgeWpHydration?.currentUser) {
        globalUser = window.forgeWpHydration.currentUser;
      }
      globalInitializing = false;
    }
  }
}

/**
 * Hook to execute authentication actions like login, logout, and registration.
 */
export function useWpAuth() {
  const context = React.useContext(WpAuthContext);
  
  const [standaloneState, setStandaloneState] = React.useState(() => ({
    user: globalUser,
    loading: globalLoading,
    initializing: globalInitializing,
    error: globalError,
  }));

  React.useEffect(() => {
    if (context) return;
    const handler = () => {
      setStandaloneState({
        user: globalUser,
        loading: globalLoading,
        initializing: globalInitializing,
        error: globalError,
      });
    };
    globalListeners.add(handler);
    return () => {
      globalListeners.delete(handler);
    };
  }, [context]);

  if (context) {
    return {
      login: context.login,
      logout: context.logout,
      register: context.register,
      loading: context.loading,
      initializing: context.initializing,
      error: stripHtml(context.error),
      loginField: context.loginField,
      emailVerificationEnabled: context.emailVerificationEnabled,
      verifyEmail: context.verifyEmail,
      resendVerificationEmail: context.resendVerificationEmail,
      forgotPassword: context.forgotPassword,
      resetPassword: context.resetPassword,
    };
  }

  // Standalone methods
  const login = async (username: string, password: string, redirectUrl?: string): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    const trimmedUsername = username.trim();
    const loginField = window.forgeWpHydration?.loginField || 'usernameAndEmail';

    if (loginField === 'usernameOnly' && trimmedUsername.includes('@')) {
      globalError = 'Please log in using your username only.';
      globalLoading = false;
      notifyAuthSubscribers();
      return false;
    }

    if (loginField === 'emailOnly' && !trimmedUsername.includes('@')) {
      globalError = 'Please log in using your email address only.';
      globalLoading = false;
      notifyAuthSubscribers();
      return false;
    }

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 600));
      const mockUsers = window._forgeWpMockUsers || [];
      const found = mockUsers.find((u) => {
        const matchesUsername = u.username.toLowerCase() === trimmedUsername.toLowerCase();
        const matchesEmail = u.email.toLowerCase() === trimmedUsername.toLowerCase();
        if (loginField === 'usernameOnly') return matchesUsername;
        if (loginField === 'emailOnly') return matchesEmail;
        return matchesUsername || matchesEmail;
      });

      if (found && password.length >= 3) {
        // @ts-ignore
        const envEmailVerification = import.meta.env.FORGEWP_AUTH_EMAIL_VERIFICATION === 'true' || import.meta.env.FORGEWP_AUTH_EMAIL_VERIFICATION === true;
        // @ts-ignore
        const envBlockLogin = import.meta.env.FORGEWP_AUTH_BLOCK_LOGIN_UNVERIFIED === 'true' || import.meta.env.FORGEWP_AUTH_BLOCK_LOGIN_UNVERIFIED === true;
        if (envEmailVerification && envBlockLogin && found.emailVerified !== true) {
          globalError = 'Your email address has not been verified yet. Please check your inbox or resend the verification link.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        globalUser = found;
        window.localStorage.setItem('forgewp_auth_session', JSON.stringify(found));
        globalLoading = false;
        notifyAuthSubscribers();
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          window.location.reload();
        }
        return true;
      } else {
        globalError = 'Invalid username or password.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    } else {
      if (isStandaloneJwtEnabled()) {
        try {
          const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/jwt-auth/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            globalError = data.message || 'Invalid username or password.';
            globalLoading = false;
            notifyAuthSubscribers();
            return false;
          }

          const data = await res.json();
          if (data && data.token) {
            window.localStorage.setItem('forgewp_jwt_token', data.token);
            const payload = decodeStandaloneJwt(data.token);
            globalUser = {
              id: payload?.data?.user?.id || data.user_id || 0,
              username: data.user_nicename || payload?.data?.user?.user_login || username,
              email: data.user_email || payload?.data?.user?.user_email || '',
              displayName: data.user_display_name || payload?.data?.user?.display_name || username,
              roles: payload?.data?.user?.roles || ['subscriber'],
              avatarUrl: data.avatar || `https://picsum.photos/seed/${data.user_nicename || username}/150/150`,
            };
            globalLoading = false;
            notifyAuthSubscribers();
            if (redirectUrl) {
              window.location.href = redirectUrl;
            } else {
              window.location.reload();
            }
            return true;
          }
          globalError = 'Invalid token response from server.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        } catch (err: any) {
          globalError = err.message || 'Connection error.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }
      }

      // Cookie login
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Authentication failed.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        const data = await res.json();
        if (data && data.id) {
          globalUser = data;
          globalLoading = false;
          notifyAuthSubscribers();
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            window.location.reload();
          }
          return true;
        }
        globalError = 'Invalid server response.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const logout = async (): Promise<void> => {
    globalLoading = true;
    notifyAuthSubscribers();

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 300));
      globalUser = null;
      window.localStorage.removeItem('forgewp_auth_session');
      globalLoading = false;
      notifyAuthSubscribers();
    } else {
      if (isStandaloneJwtEnabled()) {
        window.localStorage.removeItem('forgewp_jwt_token');
        globalUser = null;
        globalLoading = false;
        notifyAuthSubscribers();
        return;
      }

      try {
        await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/logout`, { method: 'POST' });
      } catch (e) {}
      globalUser = null;
      globalLoading = false;
      notifyAuthSubscribers();
      window.location.reload();
    }
  };

  const register = async (username: string, email: string, password: string, metadata?: Record<string, any>): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockUsers = window._forgeWpMockUsers || [];
      const exists = mockUsers.some(
        (u) => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) {
        globalError = 'Username or email already exists.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }

      const emailVerificationEnabled = window.forgeWpHydration?.emailVerificationEnabled || false;
      const newUser = {
        id: Math.floor(Math.random() * 1000) + 10,
        username,
        email,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        roles: ['subscriber'],
        avatarUrl: `https://picsum.photos/seed/${username}/150/150`,
        capabilities: [],
        emailVerified: !emailVerificationEnabled,
        ...metadata,
      };

      if (window._forgeWpMockUsers) {
        window._forgeWpMockUsers.push(newUser);
      }

      if (emailVerificationEnabled) {
        globalLoading = false;
        notifyAuthSubscribers();
        return true;
      }

      globalUser = newUser;
      window.localStorage.setItem('forgewp_auth_session', JSON.stringify(newUser));
      globalLoading = false;
      notifyAuthSubscribers();
      return true;
    } else {
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, metadata }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Registration failed.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        const data = await res.json();
        const emailVerificationEnabled = window.forgeWpHydration?.emailVerificationEnabled || data?.requiresVerification || false;

        if (emailVerificationEnabled) {
          globalLoading = false;
          notifyAuthSubscribers();
          return true;
        }

        if (data && data.id) {
          globalUser = data;
          globalLoading = false;
          notifyAuthSubscribers();
          return true;
        }
        globalError = 'Invalid server response.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const verifyEmail = async (userId: number, token: string): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockPending = JSON.parse(window.localStorage.getItem('forgewp_mock_verification_tokens') || '{}');
      if (mockPending[token] && mockPending[token] === userId) {
        const mockUsers = window._forgeWpMockUsers || [];
        const found = mockUsers.find((u: any) => u.id === userId);
        if (found) {
          found.emailVerified = true;

          // Persist verified state to cms/users.json on disk so logout + re-login still works
          fetch('/forgewp-dev-api/write-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(found),
          }).catch(() => {});

          delete mockPending[token];
          window.localStorage.setItem('forgewp_mock_verification_tokens', JSON.stringify(mockPending));
          globalUser = found;
          window.localStorage.setItem('forgewp_auth_session', JSON.stringify(found));
          globalLoading = false;
          notifyAuthSubscribers();
          return true;
        }
      }
      globalError = 'Invalid or expired verification token (simulated).';
      globalLoading = false;
      notifyAuthSubscribers();
      return false;
    } else {
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Email verification failed.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        const data = await res.json();
        if (data && data.success && data.user) {
          globalUser = data.user;
          globalLoading = false;
          notifyAuthSubscribers();
          return true;
        }
        globalError = 'Verification succeeded, but login response was empty.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const forgotPassword = async (loginName: string): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 600));
      const mockUsers = window._forgeWpMockUsers || [];
      const found = mockUsers.find(
        (u: any) => u.username.toLowerCase() === loginName.toLowerCase() || u.email.toLowerCase() === loginName.toLowerCase()
      );

      if (!found) {
        globalError = 'User not found.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }

      const mockResetToken = 'mock-reset-' + Math.random().toString(36).substring(2, 10);
      const mockResetTokens = JSON.parse(window.localStorage.getItem('forgewp_mock_reset_tokens') || '{}');
      mockResetTokens[mockResetToken] = found.username;
      window.localStorage.setItem('forgewp_mock_reset_tokens', JSON.stringify(mockResetTokens));

      const resetLink = `${window.location.origin}/reset-password?key=${mockResetToken}&login=${encodeURIComponent(found.username)}`;
      console.log(`[ForgeWP Auth] Simulated Password Reset email sent to ${found.email}. Reset Link: ${resetLink}`);

      // Post log to dev server to record in cms/email-logs.json
      fetch('/forgewp-dev-api/write-email-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: found.email,
          subject: 'Password Reset Request',
          message: `Welcome to ForgeWP! Click this link to reset your password:\n\n${resetLink}`,
          verification_url: resetLink,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});

      globalLoading = false;
      notifyAuthSubscribers();
      return true;
    } else {
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/lost-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_login: loginName }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Failed to request password reset.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        globalLoading = false;
        notifyAuthSubscribers();
        return true;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const resetPassword = async (loginName: string, key: string, pass: string): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockResetTokens = JSON.parse(window.localStorage.getItem('forgewp_mock_reset_tokens') || '{}');
      if (mockResetTokens[key] && mockResetTokens[key].toLowerCase() === loginName.toLowerCase()) {
        delete mockResetTokens[key];
        window.localStorage.setItem('forgewp_mock_reset_tokens', JSON.stringify(mockResetTokens));
        globalLoading = false;
        notifyAuthSubscribers();
        return true;
      }
      globalError = 'Invalid or expired password reset token.';
      globalLoading = false;
      notifyAuthSubscribers();
      return false;
    } else {
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: loginName, key, password: pass }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Failed to reset password.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        globalLoading = false;
        notifyAuthSubscribers();
        return true;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    globalLoading = true;
    globalError = null;
    notifyAuthSubscribers();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      globalError = 'Email address is required.';
      globalLoading = false;
      notifyAuthSubscribers();
      return false;
    }

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockUsers = window._forgeWpMockUsers || [];
      const found = mockUsers.find(
        (u: any) =>
          u.email.toLowerCase() === trimmedEmail.toLowerCase() ||
          u.username.toLowerCase() === trimmedEmail.toLowerCase()
      );

      if (!found) {
        const loginFieldVal = window.forgeWpHydration?.loginField || 'usernameAndEmail';
        let errorMsg = 'No account found with this email address or username.';
        if (loginFieldVal === 'emailOnly') {
          errorMsg = 'No account found with this email address.';
        } else if (loginFieldVal === 'usernameOnly') {
          errorMsg = 'No account found with this username.';
        }
        globalError = errorMsg;
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }

      if (found.emailVerified) {
        globalError = 'This email address is already verified.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }

      const mockVerificationToken = 'mock-verification-' + Math.random().toString(36).substring(2, 10);
      const mockPending = JSON.parse(window.localStorage.getItem('forgewp_mock_verification_tokens') || '{}');
      mockPending[mockVerificationToken] = found.id;
      window.localStorage.setItem('forgewp_mock_verification_tokens', JSON.stringify(mockPending));

      const verificationUrl = `${window.location.origin}/verify-email?userId=${found.id}&token=${mockVerificationToken}`;
      console.log(`[ForgeWP Auth] Simulated Verification Email resent to ${found.email}. Verification Link: ${verificationUrl}`);

      // Post log to dev server to record in cms/email-logs.json
      fetch('/forgewp-dev-api/write-email-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: found.email,
          subject: 'Verify your ForgeWP Account',
          message: `Welcome to ForgeWP! Click this link to verify your email address:\n\n${verificationUrl}`,
          verification_url: verificationUrl,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});

      globalLoading = false;
      notifyAuthSubscribers();
      return true;
    } else {
      try {
        const res = await fetch(`${getStandAloneApiBaseUrl()}/wp-json/forgewp/v1/auth/resend-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          globalError = data.message || 'Failed to resend verification email.';
          globalLoading = false;
          notifyAuthSubscribers();
          return false;
        }

        globalLoading = false;
        notifyAuthSubscribers();
        return true;
      } catch (err: any) {
        globalError = err.message || 'Connection error.';
        globalLoading = false;
        notifyAuthSubscribers();
        return false;
      }
    }
  };

  const loginField = window.forgeWpHydration?.loginField || 'usernameAndEmail';
  const emailVerificationEnabled = window.forgeWpHydration?.emailVerificationEnabled || false;

  return {
    login,
    logout,
    register,
    loading: standaloneState.loading,
    initializing: standaloneState.initializing,
    error: stripHtml(standaloneState.error),
    loginField,
    emailVerificationEnabled,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
  };
}

/**
 * Hook to retrieve the currently logged-in user profile.
 */
export function useWpUser(): WpUser | null {
  const context = React.useContext(WpAuthContext);
  
  const [standaloneUser, setStandaloneUser] = React.useState(globalUser);

  React.useEffect(() => {
    if (context) return;
    const handler = () => {
      setStandaloneUser(globalUser);
    };
    globalListeners.add(handler);
    return () => {
      globalListeners.delete(handler);
    };
  }, [context]);

  if (context) {
    const user = context.user;
    if (!user) return null;
    return user;
  }

  if (typeof window !== 'undefined' && window._forgeWpCompileTime === true) {
    return null;
  }

  const user = standaloneUser;
  if (!user) return null;

  if (IS_DEV && (!user.capabilities || user.capabilities.length === 0)) {
    const mockRoles = typeof window !== 'undefined' ? window._forgeWpMockRoles : {};
    if (mockRoles) {
      const capsSet = new Set<string>();
      for (const role of user.roles) {
        const caps = mockRoles[role];
        if (Array.isArray(caps)) {
          caps.forEach((c) => capsSet.add(c));
        }
      }
      user.capabilities = Array.from(capsSet);
    }
  }

  return user;
}

/**
 * Hook to check if the current user has a specific capability.
 */
export function useWpCapability(capability: string): boolean {
  const user = useWpUser();
  if (!user) return false;

  if (Array.isArray(user.capabilities)) {
    return user.capabilities.includes(capability);
  }

  return false;
}

export interface WpPageConfig {
  protected?: boolean;
  redirect?: string;
  allowed?: string;
}

