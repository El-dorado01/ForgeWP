export function registrationMetaFields(auth = {}) {
  const fields = auth.registrationMetaFields ?? [];
  if (!Array.isArray(fields) || fields.some((key) =>
    typeof key !== 'string' || !/^[a-z][a-z0-9_]*$/.test(key) ||
    /(^|_)(capabilities|user_level)$/.test(key) ||
    ['role', 'roles', 'session_tokens'].includes(key) || key.startsWith('forgewp_')
  ) || new Set(fields).size !== fields.length) {
    throw new Error('auth.registrationMetaFields must contain unique lowercase profile keys; role, capability, session and ForgeWP-owned keys are reserved.');
  }
  return fields;
}
