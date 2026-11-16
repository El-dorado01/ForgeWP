/** API base without a trailing slash; append /wp-json/... at the call site. */
export function normalizeAuthBase(base: string): string {
  return base.replace(/\/+$/, '');
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
