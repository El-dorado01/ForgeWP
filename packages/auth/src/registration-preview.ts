import type { WpUser } from './hooks.js';

export interface RegistrationPreviewPolicy {
  registration?: boolean;
  emailVerification?: boolean;
  autoLoginAfterSignup?: boolean;
  defaultRole?: string;
  loginField?: 'usernameOnly' | 'emailOnly' | 'usernameAndEmail';
  registrationMetaFields?: string[];
  reservedUsernames?: string[];
}

/** Development simulation only. The WordPress endpoint owns real validation. */
export function registerPreviewUser(username: string, email: string, password: string, metadata: Record<string, unknown> = {}, fallbackVerification = false, fallbackLoginField = 'usernameAndEmail'): { user: WpUser; autoLogin: boolean; notice: string } {
  const policy = window._forgeWpAuthPreview || {};
  if (policy.registration === false) throw new Error('Registration is currently disabled.');
  username = username.trim();
  email = email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) throw new Error('A valid email and password are required.');
  const users = window._forgeWpMockUsers || [];
  if ((policy.loginField || fallbackLoginField) === 'emailOnly') {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '') || 'member';
    username = base;
    let suffix = 1;
    while (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) username = base + suffix++;
  }
  if (!username) throw new Error('Username is required.');
  if (policy.reservedUsernames?.includes(username.toLowerCase())) throw new Error('This username is reserved.');
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) throw new Error('Username is already taken.');
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email is already registered.');
  const approved = policy.registrationMetaFields || [];
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.entries(metadata).some(([key, value]) => !approved.includes(key) || !['string', 'number', 'boolean'].includes(typeof value))) throw new Error('Registration metadata contains an unsupported field or value.');
  const profile = Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value).replace(/<[^>]*>/g, '').trim()]));
  const verification = policy.emailVerification ?? window.forgeWpHydration?.emailVerificationEnabled ?? fallbackVerification;
  const mockRoles = window._forgeWpMockRoles || {};
  const role = policy.defaultRole || window.forgeWpHydration?.siteSettings?.authDefaultRole || 'subscriber';
  const user: WpUser = { id: Math.max(Date.now(), ...users.map((u) => u.id + 1)), username, email, displayName: username, roles: [role], capabilities: mockRoles[role] || [], avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(username)}/150/150`, emailVerified: !verification, metadata: profile };
  window._forgeWpMockUsers = [...users, user];
  const log = (url: string, data: unknown) => { void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {}); };
  log('/forgewp-dev-api/write-user', user);
  if (verification) {
    const token = 'dev-token-' + Math.random().toString(36).slice(2);
    let pending: Record<string, number> = {};
    try { const parsed = JSON.parse(window.localStorage.getItem('forgewp_mock_verification_tokens') || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) pending = parsed; } catch {}
    pending[token] = user.id;
    window.localStorage.setItem('forgewp_mock_verification_tokens', JSON.stringify(pending));
    const link = `${window.location.origin}/verify-email?userId=${user.id}&token=${token}`;
    log('/forgewp-dev-api/write-email-log', { to: email, subject: 'Verify your ForgeWP Account', message: `Verify your account: ${link}`, verification_url: link, timestamp: new Date().toISOString() });
  }
  return { user, autoLogin: !verification && policy.autoLoginAfterSignup !== false, notice: verification ? 'Registration successful. Check the preview email log for your verification link.' : policy.autoLoginAfterSignup === false ? 'Registration successful. Please sign in.' : 'Registration successful.' };
}
