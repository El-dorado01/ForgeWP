/** Preview token consumption; real password changes use WordPress reset keys. */
export function consumePreviewResetToken(login: string, key: string, password: string): boolean {
  if (!login.trim() || !key || !password) return false;
  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(window.localStorage.getItem('forgewp_mock_reset_tokens') || '{}');
  } catch { return false; }
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens) || typeof tokens[key] !== 'string' || (tokens[key] as string).toLowerCase() !== login.trim().toLowerCase()) return false;
  delete tokens[key];
  window.localStorage.setItem('forgewp_mock_reset_tokens', JSON.stringify(tokens));
  return true;
}
