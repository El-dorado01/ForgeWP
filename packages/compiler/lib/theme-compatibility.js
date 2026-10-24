// Baseline metadata for generated themes; project acceptance verifies support.
export function resolveThemeCompatibility(config) {
  const value = config.compatibility;
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
    throw new Error('compatibility must be an object');
  }
  const result = { requiresWordPress: '6.6', requiresPhp: '7.4', ...value };
  for (const key of Object.keys(result)) {
    if (!['requiresWordPress', 'requiresPhp', 'testedUpTo'].includes(key)) {
      throw new Error(`Unknown compatibility option: ${key}`);
    }
    if (typeof result[key] !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(result[key])) {
      throw new Error(`compatibility.${key} must be a numeric version string such as "6.6"`);
    }
  }
  const compare = (a, b) => {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const difference = (left[i] || 0) - (right[i] || 0);
      if (difference) return difference;
    }
    return 0;
  };
  if (compare(result.requiresWordPress, '6.6') < 0 || compare(result.requiresPhp, '7.4') < 0) {
    throw new Error('compatibility cannot lower the generated baseline: WordPress 6.6 and PHP 7.4');
  }
  if (result.testedUpTo && compare(result.testedUpTo, result.requiresWordPress) < 0) {
    throw new Error('compatibility.testedUpTo must be at least requiresWordPress');
  }
  return result;
}
