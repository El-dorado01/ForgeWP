import React from 'react';
import { WpUser, WpAuthContext, useWpUser, useWpCapability, useWpAuth, WpPageConfig, stripHtml } from './hooks';

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  // @ts-ignore
  import.meta.env?.DEV === true;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).FORGEWP_API_URL) {
    return (window as any).FORGEWP_API_URL;
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
  try {
    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env) {
      const processEnv = (globalThis as any).process.env;
      const envUrl = processEnv.FORGEWP_API_URL || processEnv.NEXT_PUBLIC_WP_API_URL || processEnv.WP_API_URL;
      if (envUrl) return envUrl;
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home;
    if (homeUrl) {
      try {
        return new URL(homeUrl).pathname.replace(/\/$/, '');
      } catch (e) {}
    }
  }
  return '';
}

function decodeJwt(token: string): any {
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

function isJwtAuthEnabled(): boolean {
  if (typeof window !== 'undefined' && (window as any).FORGEWP_JWT_AUTH === true) {
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
  try {
    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env) {
      const processEnv = (globalThis as any).process.env;
      if (
        processEnv.FORGEWP_JWT_AUTH === 'true' ||
        processEnv.NEXT_PUBLIC_WP_JWT_AUTH === 'true' ||
        processEnv.WP_JWT_AUTH === 'true'
      ) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function resolveMockUserCapabilities(user: WpUser): WpUser {
  if (typeof window === 'undefined') return user;
  const mockRoles = window._forgeWpMockRoles || {};
  const capsSet = new Set<string>();
  for (const role of user.roles) {
    const caps = mockRoles[role];
    if (Array.isArray(caps)) {
      caps.forEach((c) => capsSet.add(c));
    }
  }
  return {
    ...user,
    capabilities: Array.from(capsSet),
  };
}

/**
 * Context provider that manages authentication state, session caches, and login redirects.
 * 
 * @param props.loginField Policy dictating which user identifier (username or email) is accepted.
 *   Note: A password is still always required regardless of this setting.
 * 
 *   Options:
 *   - 'usernameOnly': Restricts login identifier strictly to WordPress usernames.
 *   - 'emailOnly': Restricts login identifier strictly to WordPress email addresses.
 *   - 'usernameAndEmail': Allows either username or email address for login identifier (default).
 */
const getInitialSession = (initialLoginField: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail') => {
  if (typeof window === 'undefined' || (window as any)._forgeWpCompileTime === true) {
    return {
      user: null,
      loginField: initialLoginField,
      emailVerificationEnabled: false,
      hasSession: true, // Bypass initializing phase during compile/SSR so forms render statically
    };
  }

  if (IS_DEV) {
    const cached = window.localStorage.getItem('forgewp_auth_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          user: resolveMockUserCapabilities(parsed),
          loginField: initialLoginField,
          emailVerificationEnabled: false,
          hasSession: true,
        };
      } catch (e) {
        window.localStorage.removeItem('forgewp_auth_session');
      }
    }
    return {
      user: null,
      loginField: initialLoginField,
      emailVerificationEnabled: false,
      hasSession: false,
    };
  }

  // 1. Try secure CSP-compliant JSON script block
  const sessionScript = document.getElementById('forgewp-session');
  if (sessionScript) {
    try {
      const parsed = JSON.parse(sessionScript.textContent || '{}');
      return {
        user: parsed.user || null,
        loginField: parsed.loginField || initialLoginField,
        emailVerificationEnabled: parsed.emailVerificationEnabled || false,
        hasSession: parsed.loggedIn ? true : false,
      };
    } catch (e) {
      console.warn('[ForgeWP Auth] Failed to parse forgewp-session script tag:', e);
    }
  }

  // 2. Fallback to window.forgeWpHydration (non-CSP)
  const win = window as any;
  if (win.forgeWpHydration) {
    return {
      user: win.forgeWpHydration.currentUser || null,
      loginField: win.forgeWpHydration.loginField || initialLoginField,
      emailVerificationEnabled: win.forgeWpHydration.emailVerificationEnabled || false,
      hasSession: win.forgeWpHydration.currentUser ? true : false,
    };
  }

  return {
    user: null,
    loginField: initialLoginField,
    emailVerificationEnabled: false,
    hasSession: false,
  };
};

/**
 * Context provider that manages authentication state, session caches, and login redirects.
 * 
 * @param props.loginField Policy dictating which user identifier (username or email) is accepted.
 *   Note: A password is still always required regardless of this setting.
 * 
 *   Options:
 *   - 'usernameOnly': Restricts login identifier strictly to WordPress usernames.
 *   - 'emailOnly': Restricts login identifier strictly to WordPress email addresses.
 *   - 'usernameAndEmail': Allows either username or email address for login identifier (default).
 */
export function WpAuthProvider({
  children,
  loginField: initialLoginField = 'usernameAndEmail',
}: {
  children: React.ReactNode;
  loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
}) {
  const initialSession = React.useMemo(() => getInitialSession(initialLoginField), [initialLoginField]);

  const [loginField, setLoginField] = React.useState<'usernameOnly' | 'emailOnly' | 'usernameAndEmail'>(initialSession.loginField);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = React.useState<boolean>(initialSession.emailVerificationEnabled);
  const [user, setUser] = React.useState<WpUser | null>(initialSession.user);
  const [initializing, setInitializing] = React.useState(() => {
    if (typeof window !== 'undefined') {
      if (initialSession.hasSession) {
        return false;
      }
      if (isJwtAuthEnabled() && window.localStorage.getItem('forgewp_jwt_token')) {
        return true;
      }
      return false;
    }
    return false; // Compile-time / SSR
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync loginField and emailVerificationEnabled from compile-time / runtime environment and hydration
  React.useEffect(() => {
    // 1. Sync from dev environment define variables (Vite dev server)
    try {
      // @ts-ignore
      const envLoginField = import.meta.env.FORGEWP_AUTH_LOGIN_FIELD;
      if (envLoginField) {
        setLoginField(envLoginField);
      }
      // @ts-ignore
      const envEmailVerification = import.meta.env.FORGEWP_AUTH_EMAIL_VERIFICATION;
      if (envEmailVerification === 'true' || envEmailVerification === true) {
        setEmailVerificationEnabled(true);
      }
    } catch (e) {}

    // 2. Sync from window.forgeWpHydration (monolith hydration payload)
    if (typeof window !== 'undefined') {
      if (window.forgeWpHydration?.loginField) {
        setLoginField(window.forgeWpHydration.loginField);
      }
      if (window.forgeWpHydration?.emailVerificationEnabled !== undefined) {
        setEmailVerificationEnabled(window.forgeWpHydration.emailVerificationEnabled);
      }
    }
  }, []);

  // Sync loginField and emailVerificationEnabled from REST endpoint if decoupled
  React.useEffect(() => {
    const apiBase = getApiBaseUrl();
    const isDecoupled = apiBase && (apiBase.startsWith('http') || isJwtAuthEnabled());
    if (isDecoupled) {
      fetch(`${apiBase}/wp-json/forgewp/v1/auth/config`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.loginField) {
              setLoginField(data.loginField);
            }
            if (data.emailVerificationEnabled !== undefined) {
              setEmailVerificationEnabled(data.emailVerificationEnabled);
            }
          }
        })
        .catch((err) => {
          console.warn('[ForgeWP Auth] Failed to fetch remote auth configuration:', err);
        });
    }
  }, []);

  // Initialize session
  React.useEffect(() => {
    if (IS_DEV) {
      if (typeof window !== 'undefined') {
        const cached = window.localStorage.getItem('forgewp_auth_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setUser(resolveMockUserCapabilities(parsed));
          } catch (e) {
            window.localStorage.removeItem('forgewp_auth_session');
          }
        }
      }
      setInitializing(false);
    } else {
      // Production: check if JWT mode is active
      if (typeof window !== 'undefined' && isJwtAuthEnabled()) {
        const token = window.localStorage.getItem('forgewp_jwt_token');
        if (token) {
          fetch(`${getApiBaseUrl()}/wp-json/jwt-auth/v1/token/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
            .then(async (res) => {
              if (res.ok) {
                const payload = decodeJwt(token);
                const loggedUser: WpUser = {
                  id: payload?.data?.user?.id || 0,
                  username: payload?.data?.user?.user_login || '',
                  email: payload?.data?.user?.user_email || '',
                  displayName: payload?.data?.user?.display_name || '',
                  roles: payload?.data?.user?.roles || ['subscriber'],
                  avatarUrl: `https://picsum.photos/seed/${payload?.data?.user?.user_login || 'user'}/150/150`,
                };
                setUser(loggedUser);
              } else {
                window.localStorage.removeItem('forgewp_jwt_token');
              }
            })
            .catch(() => {
              const payload = decodeJwt(token);
              if (payload) {
                const loggedUser: WpUser = {
                  id: payload?.data?.user?.id || 0,
                  username: payload?.data?.user?.user_login || '',
                  email: payload?.data?.user?.user_email || '',
                  displayName: payload?.data?.user?.display_name || '',
                  roles: payload?.data?.user?.roles || ['subscriber'],
                  avatarUrl: `https://picsum.photos/seed/${payload?.data?.user?.user_login || 'user'}/150/150`,
                };
                setUser(loggedUser);
              }
            })
            .finally(() => {
              setInitializing(false);
            });
          return;
        }
      }

      // Production Cookie Auth Init: fallback check if not parsed synchronously
      if (typeof window !== 'undefined' && !initialSession.hasSession) {
        const sessionScript = document.getElementById('forgewp-session');
        if (sessionScript) {
          try {
            const parsed = JSON.parse(sessionScript.textContent || '{}');
            if (parsed.user) {
              setUser(parsed.user);
            }
          } catch (e) {}
        } else {
          const hydUser = window.forgeWpHydration?.currentUser;
          if (hydUser) {
            setUser(hydUser);
          }
        }
      }
      setInitializing(false);
    }
  }, [initialSession.hasSession]);

  const login = React.useCallback(async (username: string, password: string, redirectUrl?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const trimmedUsername = username.trim();

    if (loginField === 'usernameOnly' && trimmedUsername.includes('@')) {
      setError('Please log in using your username only.');
      setLoading(false);
      return false;
    }

    if (loginField === 'emailOnly' && !trimmedUsername.includes('@')) {
      setError('Please log in using your email address only.');
      setLoading(false);
      return false;
    }

    if (IS_DEV) {
      // Simulate dev sign-on
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
          setError('Your email address has not been verified yet. Please check your inbox or resend the verification link.');
          setLoading(false);
          return false;
        }

        const userWithCaps = resolveMockUserCapabilities(found);
        setUser(userWithCaps);
        window.localStorage.setItem('forgewp_auth_session', JSON.stringify(userWithCaps));
        setLoading(false);
        if (typeof window !== 'undefined') {
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            window.location.reload();
          }
        }
        return true;
      } else {
        setError('Invalid username or password.');
        setLoading(false);
        return false;
      }
    } else {
      if (isJwtAuthEnabled()) {
        try {
          const res = await fetch(`${getApiBaseUrl()}/wp-json/jwt-auth/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'Invalid username or password.');
            setLoading(false);
            return false;
          }

          const data = await res.json();
          if (data && data.token) {
            window.localStorage.setItem('forgewp_jwt_token', data.token);
            
            const payload = decodeJwt(data.token);
            const loggedUser: WpUser = {
              id: payload?.data?.user?.id || data.user_id || 0,
              username: data.user_nicename || payload?.data?.user?.user_login || username,
              email: data.user_email || payload?.data?.user?.user_email || '',
              displayName: data.user_display_name || payload?.data?.user?.display_name || username,
              roles: payload?.data?.user?.roles || ['subscriber'],
              avatarUrl: data.avatar || `https://picsum.photos/seed/${data.user_nicename || username}/150/150`,
            };

            setUser(loggedUser);
            setLoading(false);
            if (typeof window !== 'undefined') {
              if (redirectUrl) {
                window.location.href = redirectUrl;
              } else {
                window.location.reload();
              }
            }
            return true;
          }
          setError('Invalid token response from server.');
          setLoading(false);
          return false;
        } catch (err: any) {
          setError(err.message || 'Connection error.');
          setLoading(false);
          return false;
        }
      }

      // Production: call custom same-domain REST API (Cookie Auth)
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: username, username, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Authentication failed.');
          setLoading(false);
          return false;
        }

        const data = await res.json();
        const userObj = (data && (data.user || data.id ? (data.user || data) : null)) as WpUser | null;
        if (userObj && userObj.id) {
          setUser(userObj);
          setLoading(false);
          if (typeof window !== 'undefined') {
            if (redirectUrl) {
              window.location.href = redirectUrl;
            } else {
              window.location.reload();
            }
          }
          return true;
        }
        setError('Invalid server response.');
        setLoading(false);
        return false;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, [loginField]);

  const logout = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 300));
      setUser(null);
      window.localStorage.removeItem('forgewp_auth_session');
      setLoading(false);
    } else {
      if (isJwtAuthEnabled()) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('forgewp_jwt_token');
        }
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/logout`, { method: 'POST' });
        setUser(null);
        setLoading(false);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (err: any) {
        setError(err.message || 'Logout failed.');
        setLoading(false);
      }
    }
  }, []);

  const register = React.useCallback(async (
    username: string,
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 500));
      const mockUsers = window._forgeWpMockUsers || [];

      if (mockUsers.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
        setError('Username is already taken.');
        setLoading(false);
        return false;
      }

      if (mockUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        setError('Email is already registered.');
        setLoading(false);
        return false;
      }

      const defaultRole = (window.forgeWpHydration?.siteSettings?.authDefaultRole) || 'subscriber';
      const isEmailVerification = window.forgeWpHydration?.emailVerificationEnabled ?? emailVerificationEnabled;

      const newUser: WpUser = {
        id: Date.now(),
        username,
        email,
        displayName: username,
        roles: [defaultRole],
        avatarUrl: `https://picsum.photos/seed/${username}/150/150`,
        emailVerified: !isEmailVerification,
        ...metadata,
      };

      if (window._forgeWpMockUsers) {
        if (!window._forgeWpMockUsers.some((u: any) => u.id === newUser.id)) {
          window._forgeWpMockUsers.push(newUser);
        }
      }

      // Post log to dev server to record new user in cms/users.json
      fetch('/forgewp-dev-api/write-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      }).catch(() => {});

      if (emailVerificationEnabled) {
        const mockToken = 'dev-token-' + Math.random().toString(36).substring(2, 10);
        const mockPending = JSON.parse(window.localStorage.getItem('forgewp_mock_verification_tokens') || '{}');
        mockPending[mockToken] = newUser.id;
        window.localStorage.setItem('forgewp_mock_verification_tokens', JSON.stringify(mockPending));
        
        const verificationLink = `${window.location.origin}/verify-email?userId=${newUser.id}&token=${mockToken}`;
        console.log(`[ForgeWP Auth] Simulated Verification Email sent to ${email}. Verification Link: ${verificationLink}`);
        
        // Post log to dev server to record in cms/email-logs.json
        fetch('/forgewp-dev-api/write-email-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: 'Verify your ForgeWP Account',
            message: `Welcome to ForgeWP! Click this link to verify your email address:\n\n${verificationLink}`,
            verification_url: verificationLink,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});

        setLoading(false);
        return true;
      }

      setUser(newUser);
      window.localStorage.setItem('forgewp_auth_session', JSON.stringify(newUser));
      setLoading(false);
      return true;
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, metadata }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Registration failed.');
          setLoading(false);
          return false;
        }

        const data = await res.json();
        const userObj = (data && (data.user || data.id ? (data.user || data) : null)) as WpUser | null;
        if (userObj && userObj.id) {
          if (isJwtAuthEnabled()) {
            return login(username, password);
          }
          setUser(userObj);
          setLoading(false);
          return true;
        }
        if (data && data.requiresVerification) {
          setLoading(false);
          return true;
        }
        setError('Registration succeeded, but login response was empty.');
        setLoading(false);
        return false;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, [emailVerificationEnabled, login]);

  const verifyEmail = React.useCallback(async (userId: number, token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockPending = JSON.parse(window.localStorage.getItem('forgewp_mock_verification_tokens') || '{}');
      if (mockPending[token] && mockPending[token] === userId) {
        const mockUsers = (window as any)._forgeWpMockUsers || [];
        const found = mockUsers.find((u: any) => u.id === userId);
        if (found) {
          found.emailVerified = true;
          
          // Post updated user state to dev server to update in cms/users.json
          fetch('/forgewp-dev-api/write-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(found)
          }).catch(() => {});

          delete mockPending[token];
          window.localStorage.setItem('forgewp_mock_verification_tokens', JSON.stringify(mockPending));
          
          setUser(found);
          window.localStorage.setItem('forgewp_auth_session', JSON.stringify(found));
          setLoading(false);
          return true;
        }
      }
      setError('Invalid or expired verification token (simulated).');
      setLoading(false);
      return false;
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Email verification failed.');
          setLoading(false);
          return false;
        }

        const data = await res.json().catch(() => ({}));
        if (data && data.success) {
          if (data.user) {
            setUser(data.user);
            window.localStorage.setItem('forgewp_auth_session', JSON.stringify(data.user));
          }
          setLoading(false);
          return true;
        }

        setError(data.message || 'Email verification failed.');
        setLoading(false);
        return false;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, []);

  const forgotPassword = React.useCallback(async (loginName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 600));
      const mockUsers = (window as any)._forgeWpMockUsers || [];
      const found = mockUsers.find(
        (u: any) => u.username.toLowerCase() === loginName.toLowerCase() || u.email.toLowerCase() === loginName.toLowerCase()
      );

      if (!found) {
        setError('User not found.');
        setLoading(false);
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

      setLoading(false);
      return true;
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/lost-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_login: loginName }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Failed to request password reset.');
          setLoading(false);
          return false;
        }

        setLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, []);

  const resetPassword = React.useCallback(async (loginName: string, key: string, pass: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockResetTokens = JSON.parse(window.localStorage.getItem('forgewp_mock_reset_tokens') || '{}');
      if (mockResetTokens[key] && mockResetTokens[key].toLowerCase() === loginName.toLowerCase()) {
        delete mockResetTokens[key];
        window.localStorage.setItem('forgewp_mock_reset_tokens', JSON.stringify(mockResetTokens));
        setLoading(false);
        return true;
      }
      setError('Invalid or expired password reset token.');
      setLoading(false);
      return false;
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: loginName, key, password: pass }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Failed to reset password.');
          setLoading(false);
          return false;
        }

        setLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, []);

  const resendVerificationEmail = React.useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email address is required.');
      setLoading(false);
      return false;
    }

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 800));
      const mockUsers = (window as any)._forgeWpMockUsers || [];
      const found = mockUsers.find(
        (u: any) =>
          u.email.toLowerCase() === trimmedEmail.toLowerCase() ||
          u.username.toLowerCase() === trimmedEmail.toLowerCase()
      );

      if (!found) {
        const loginFieldVal = (window as any).forgeWpHydration?.loginField || 'usernameAndEmail';
        let errorMsg = 'No account found with this email address or username.';
        if (loginFieldVal === 'emailOnly') {
          errorMsg = 'No account found with this email address.';
        } else if (loginFieldVal === 'usernameOnly') {
          errorMsg = 'No account found with this username.';
        }
        setError(errorMsg);
        setLoading(false);
        return false;
      }

      if (found.emailVerified) {
        setError('This email address is already verified.');
        setLoading(false);
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

      setLoading(false);
      return true;
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/resend-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Failed to resend verification email.');
          setLoading(false);
          return false;
        }

        setLoading(false);
        return true;
      } catch (err: any) {
        setError(err.message || 'Connection error.');
        setLoading(false);
        return false;
      }
    }
  }, []);

  const value = React.useMemo(() => ({
    user,
    loading,
    initializing,
    error: stripHtml(error),
    login,
    logout,
    register,
    loginField,
    emailVerificationEnabled,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendVerificationEmail,
  }), [user, loading, initializing, error, login, logout, register, loginField, emailVerificationEnabled, verifyEmail, forgotPassword, resetPassword, resendVerificationEmail]);

  return <WpAuthContext.Provider value={value}>{children}</WpAuthContext.Provider>;
}

export function WpAuthGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const context = React.useContext(WpAuthContext);
  const user = context?.user;

  if (IS_DEV) {
    return user ? <>{children}</> : <>{fallback}</>;
  }

  // Hydration in production
  if (typeof window !== 'undefined' && !window._forgeWpCompileTime) {
    const hydUser = window.forgeWpHydration?.currentUser;
    return hydUser ? <>{children}</> : <>{fallback}</>;
  }

  // SSR compile-time: return transpiler placeholders
  return (
    <>
      {/* @ts-ignore */}
      <forgewp-auth-gate-start />
      {children}
      {fallback && (
        <>
          {/* @ts-ignore */}
          <forgewp-auth-gate-fallback />
          {fallback}
        </>
      )}
      {/* @ts-ignore */}
      <forgewp-auth-gate-end />
    </>
  );
}

export function WpCapabilityGate({
  allowed,
  children,
  fallback = null,
}: {
  allowed: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasCap = useWpCapability(allowed);

  if (IS_DEV) {
    return hasCap ? <>{children}</> : <>{fallback}</>;
  }

  // Hydration in production
  if (typeof window !== 'undefined' && !window._forgeWpCompileTime) {
    return hasCap ? <>{children}</> : <>{fallback}</>;
  }

  // SSR compile-time: return transpiler placeholders
  return (
    <>
      {/* @ts-ignore */}
      <forgewp-capability-gate-start allowed={allowed} />
      {children}
      {fallback && (
        <>
          {/* @ts-ignore */}
          <forgewp-capability-gate-fallback />
          {fallback}
        </>
      )}
      {/* @ts-ignore */}
      <forgewp-capability-gate-end />
    </>
  );
}

export function WpLoginForm({
  className = '',
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const context = React.useContext(WpAuthContext);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);
  const [unverifiedNotice, setUnverifiedNotice] = React.useState<string | null>(null);
  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [resendMsg, setResendMsg] = React.useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const cooldownRef = React.useRef<any>(null);

  if (!context) return null;

  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleResend = async () => {
    const input = username.trim();
    if (!input) {
      setResendMsg('Please enter your username or email above first.');
      setResendStatus('failed');
      return;
    }
    setResendStatus('sending');
    setResendMsg(null);
    try {
      const ok = await context.resendVerificationEmail(input);
      if (ok) {
        setResendStatus('success');
        if (!unverifiedNotice) {
          setUnverifiedNotice('Please verify your email address before logging in.');
        }
        setResendCooldown(60);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setResendCooldown((prev: number) => {
            if (prev <= 1) {
              clearInterval(cooldownRef.current);
              cooldownRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setResendStatus('failed');
        setResendMsg(context.error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      setResendStatus('failed');
      setResendMsg(err.message || 'An error occurred.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFormErr('Please enter both username and password.');
      return;
    }
    setSubmitting(true);
    setFormErr(null);
    setUnverifiedNotice(null);
    setResendStatus('idle');
    try {
      const ok = await context.login(username, password);
      if (ok) {
        if (onSuccess) onSuccess();
      } else {
        const errStr = context.error || 'Invalid credentials.';
        setFormErr(errStr);
        if (/verif/i.test(errStr)) {
          setUnverifiedNotice(errStr);
        }
      }
    } catch (err: any) {
      const msg = stripHtml(err.message) || 'Sign in failed.';
      setFormErr(msg);
      if (/verif/i.test(msg)) {
        setUnverifiedNotice(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isUnverified = Boolean(unverifiedNotice || (formErr && /verif/i.test(formErr)));
  const displayMsg = unverifiedNotice || formErr;

  return (
    <form
      onSubmit={handleSubmit}
      className={`forgewp-auth-form forgewp-login-form border-2 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 max-w-sm w-full ${className}`}
    >
      <h3 className="text-xl font-bold uppercase tracking-tight">Account Log In</h3>
      
      {displayMsg && (
        isUnverified ? (
          resendStatus === 'success' ? (
            <div className="border-2 p-3 font-semibold text-sm flex flex-col gap-2 bg-emerald-50 border-emerald-500 text-emerald-900">
              <div className="flex items-start gap-2">
                <span>✓</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Verification Link Sent</span>
                  <span className="text-xs font-normal text-emerald-800">
                    A fresh verification link has been sent to your email. Check your inbox (and spam folder).
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-300 flex items-center gap-1.5 flex-wrap text-xs text-emerald-900 mt-1">
                <span>Didn&apos;t receive it?</span>
                {resendCooldown > 0 ? (
                  <span className="text-emerald-800 font-medium">
                    Resend available in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-bold underline underline-offset-2 hover:text-emerald-950 cursor-pointer"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 p-3 font-semibold text-sm flex flex-col gap-2 bg-amber-50 border-amber-500 text-amber-900">
              <div className="flex items-start gap-2">
                <span>✉️</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Email Verification Required</span>
                  <span className="text-xs font-normal text-amber-800">{displayMsg}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-300 flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-amber-900">
                  <span>Need a new link sent to your inbox?</span>
                  {resendCooldown > 0 ? (
                    <span className="text-amber-800 font-medium">
                      Resend available in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={resendStatus === 'sending'}
                      onClick={handleResend}
                      className="font-bold underline underline-offset-2 hover:text-amber-950 disabled:opacity-50 cursor-pointer"
                    >
                      {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
                {resendStatus === 'failed' && resendMsg && (
                  <span className="text-xs text-red-600 font-medium">{resendMsg}</span>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="border-2 p-3 font-semibold text-sm flex items-start gap-2 bg-red-100 border-red-500 text-red-700">
            <span>⚠️</span>
            <span>{displayMsg}</span>
          </div>
        )
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">
          {context.loginField === 'usernameOnly' ? 'Username' : context.loginField === 'emailOnly' ? 'Email Address' : 'Username or Email'}
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder={context.loginField === 'usernameOnly' ? 'username' : context.loginField === 'emailOnly' ? 'user@example.com' : 'admin / subscriber'}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder="••••••••"
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="border-2 border-black p-3 bg-black text-white hover:bg-yellow-400 hover:text-black font-bold uppercase tracking-wider transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50"
      >
        {submitting ? 'Authenticating...' : 'Sign In'}
      </button>
    </form>
  );
}

export function WpRegisterForm({
  className = '',
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const context = React.useContext(WpAuthContext);
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);

  if (!context) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setFormErr('All fields are required.');
      return;
    }
    setSubmitting(true);
    setFormErr(null);
    try {
      const ok = await context.register(username, email, password);
      if (ok) {
        if (onSuccess) onSuccess();
      } else {
        setFormErr(context.error || 'Registration failed.');
      }
    } catch (err: any) {
      setFormErr(stripHtml(err.message) || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`forgewp-auth-form forgewp-register-form border-2 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 max-w-sm w-full ${className}`}
    >
      <h3 className="text-xl font-bold uppercase tracking-tight">Create Account</h3>
      
      {formErr && (
        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 font-semibold text-sm">
          ⚠️ {formErr}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder="newuser"
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder="user@example.com"
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder="••••••••"
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="border-2 border-black p-3 bg-black text-white hover:bg-yellow-400 hover:text-black font-bold uppercase tracking-wider transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50"
      >
        {submitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}

export function useWpPageProtect(config: WpPageConfig) {
  const { emailVerificationEnabled, initializing } = useWpAuth();
  const user = useWpUser();
  const hasCap = useWpCapability(config.allowed || 'read');

  React.useEffect(() => {
    if (!config.protected) return;
    if (initializing) return;

    // Bypass redirects during compile-time SSR
    if (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime === true) {
      return;
    }

    let redirectTarget = config.redirect || '/login';
    if (redirectTarget.startsWith('template:')) {
      const pageName = redirectTarget.replace('template:', '');
      redirectTarget = '/' + pageName.replace(/-page$/, '');
    } else if (redirectTarget.startsWith('__FORGEWP_PAGELINK_')) {
      const match = redirectTarget.match(/__FORGEWP_PAGELINK_[a-zA-Z0-9_-]+_DEFAULT_(.*?)__/);
      if (match) {
        redirectTarget = decodeURIComponent(match[1]);
      } else {
        const matchPlain = redirectTarget.match(/__FORGEWP_PAGELINK_([a-zA-Z0-9_-]+)__/);
        if (matchPlain) {
          redirectTarget = '/' + matchPlain[1].replace(/-page$/, '');
        } else {
          redirectTarget = '/login';
        }
      }
    }

    if (!user) {
      window.location.href = redirectTarget;
    } else if (emailVerificationEnabled && user.emailVerified === false) {
      window.location.href = '/verify-email';
    } else if (config.allowed && !hasCap) {
      window.location.href = '/';
    }
  }, [user, hasCap, config.protected, config.allowed, config.redirect, emailVerificationEnabled, initializing]);
}

export function WpPasswordResetForm({
  className = '',
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const [emailOrUsername, setEmailOrUsername] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      setFormErr('Please enter your email or username.');
      return;
    }
    setSubmitting(true);
    setFormErr(null);
    setSuccessMsg(null);

    if (IS_DEV) {
      await new Promise((res) => setTimeout(res, 600));
      setSuccessMsg('Reset link sent successfully (simulated).');
      setSubmitting(false);
      if (onSuccess) onSuccess();
    } else {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/lost-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_login: emailOrUsername }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFormErr(stripHtml(data.message) || 'Failed to send recovery email.');
          setSubmitting(false);
          return;
        }

        setSuccessMsg('A password reset link has been sent to your email.');
        setSubmitting(false);
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setFormErr(stripHtml(err.message) || 'Connection error.');
        setSubmitting(false);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`forgewp-auth-form forgewp-lost-password-form border-2 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 max-w-sm w-full ${className}`}
    >
      <h3 className="text-xl font-bold uppercase tracking-tight">Recover Password</h3>
      
      {formErr && (
        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 font-semibold text-sm">
          ⚠️ {formErr}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-100 border-2 border-green-500 text-green-700 p-3 font-semibold text-sm">
          ✅ {successMsg}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide">Username or Email</label>
        <input
          type="text"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          className="border-2 border-black p-2 font-mono outline-none focus:bg-yellow-50"
          placeholder="username@example.com"
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="border-2 border-black p-3 bg-black text-white hover:bg-yellow-400 hover:text-black font-bold uppercase tracking-wider transition-colors duration-150 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
