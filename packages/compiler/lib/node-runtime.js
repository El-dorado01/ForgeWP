export const SUPPORTED_NODE_RANGE = '^22.18.0 || >=24.11.0';

export function isSupportedNode(version = process.versions.node) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const [major, minor] = version.split('.').map(Number);
  return (major === 22 && minor >= 18) || (major === 24 && minor >= 11) || major > 24;
}
