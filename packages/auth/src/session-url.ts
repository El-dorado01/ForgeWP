/** API base without a trailing slash; append /wp-json/... at the call site. */
export function normalizeAuthBase(base: string): string {
  return base.replace(/\/+$/, '');
}

/** Shared precedence for provider and standalone consumers, including SSR. */
function authEnvironment() {
  // @ts-ignore -- supplied by Vite; absent in other runtimes.
  const vite = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const processEnv = (globalThis as any).process?.env;
  const browser = typeof window !== 'undefined' ? window : undefined;
  return { browser, vite, processEnv };
}

export function getAuthApiBase(): string {
  const { browser, vite, processEnv } = authEnvironment();
  const candidates = [
    browser?.FORGEWP_API_URL,
    vite?.FORGEWP_API_URL,
    vite?.VITE_WP_API_URL,
    processEnv?.FORGEWP_API_URL,
    processEnv?.NEXT_PUBLIC_WP_API_URL,
    processEnv?.WP_API_URL,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return normalizeAuthBase(value.trim());
  }
  const home = browser?.forgeWpHydration?.siteSettings?.options?.home;
  if (typeof home === 'string' && home) {
    try {
      return normalizeAuthBase(new URL(home).pathname);
    } catch {}
  }
  return '';
}

export function isJwtAuthEnabled(): boolean {
  const { browser, vite, processEnv } = authEnvironment();
  for (const value of [
    browser?.FORGEWP_JWT_AUTH,
    vite?.FORGEWP_JWT_AUTH,
    vite?.VITE_WP_JWT_AUTH,
    processEnv?.FORGEWP_JWT_AUTH,
    processEnv?.NEXT_PUBLIC_WP_JWT_AUTH,
    processEnv?.WP_JWT_AUTH,
  ]) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
  }
  return false;
}

/** Cookie logout needs the nonce emitted with the current server session. */
export function cookieLogoutRequest(): RequestInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let nonce = typeof window !== 'undefined' ? (window as any).forgeWpHydration?.restNonce : undefined;
  if ((!nonce || typeof nonce !== 'string') && typeof document !== 'undefined') {
    try {
      nonce = JSON.parse(document.getElementById('forgewp-session')?.textContent || '{}').restNonce;
    } catch {}
  }
  if (typeof nonce === 'string' && nonce) headers['X-WP-Nonce'] = nonce;
  return { method: 'POST', credentials: 'same-origin', headers, body: '{}' };
}

/** A post-login target may navigate within the current frontend origin only. */
export function safeAuthRedirect(value?: string): string | null {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value) || typeof window === 'undefined') return null;
  try {
    const base = window.location.href || window.location.origin + '/';
    const target = new URL(value, base);
    if (!['http:', 'https:'].includes(target.protocol) || target.origin !== window.location.origin || target.username || target.password) return null;
    // Avoid returning a protocol-relative path, including same-origin URLs with double leading slashes.
    return target.href;
  } catch { return null; }
}

export const JWT_STORAGE_KEY = 'forgewp_jwt_token';

export function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isUsableJwtPayload(payload: any): 'valid' | 'malformed' | 'expired' {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'malformed';
  const user = payload.data?.user;
  if (!user || typeof user !== 'object' || (!user.id && !user.user_login)) return 'malformed';
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return 'expired';
  if (payload.exp !== undefined && typeof payload.exp !== 'number') return 'malformed';
  return 'valid';
}

export function userFromJwtPayload(
  payload: any,
  overrides: { id?: number; username?: string; email?: string; displayName?: string; avatarUrl?: string } = {}
) {
  const u = payload?.data?.user;
  const username = overrides.username || u?.user_login || '';
  return {
    id: u?.id || overrides.id || 0,
    username,
    email: overrides.email || u?.user_email || '',
    displayName: overrides.displayName || u?.display_name || username,
    roles: Array.isArray(u?.roles) ? u.roles : ['subscriber'],
    avatarUrl: overrides.avatarUrl || `https://picsum.photos/seed/${username || 'user'}/150/150`,
  };
}

export function readValidStoredJwt(): { token: string; payload: any } | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  const token = window.localStorage.getItem(JWT_STORAGE_KEY);
  if (!token) return null;
  const payload = decodeJwt(token);
  if (isUsableJwtPayload(payload) !== 'valid') {
    window.localStorage.removeItem(JWT_STORAGE_KEY);
    return null;
  }
  return { token, payload };
}

export async function restoreJwtSession(
  apiBase: string
): Promise<{ status: 'none' | 'valid' | 'rejected' | 'unreachable'; user: any | null; error: string | null }> {
  const stored = readValidStoredJwt();
  if (!stored) return { status: 'none', user: null, error: null };
  try {
    const res = await fetch(`${apiBase}/wp-json/jwt-auth/v1/token/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stored.token}`,
      },
    });
    if (res.ok) {
      return { status: 'valid', user: userFromJwtPayload(stored.payload), error: null };
    }
    window.localStorage.removeItem(JWT_STORAGE_KEY);
    return { status: 'rejected', user: null, error: null };
  } catch {
    return {
      status: 'unreachable',
      user: null,
      error: 'Unable to verify session. Check your connection and try again.',
    };
  }
}
