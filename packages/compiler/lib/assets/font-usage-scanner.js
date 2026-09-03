import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Tailwind font weight class to numeric weight mapping.
 */
const TAILWIND_WEIGHT_MAP = {
  'font-thin': 100,
  'font-extralight': 200,
  'font-light': 300,
  'font-normal': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
  'font-extrabold': 800,
  'font-black': 900,
};

/**
 * Scan theme codebase for used font weights (Tailwind classes, inline styles, CSS).
 *
 * @param {string} themeRoot
 * @returns {{ usedWeights: Set<number>, occurrences: Map<number, number> }}
 */
export function scanFontWeightUsage(themeRoot) {
  const usedWeights = new Set([400]); // 400 is always assumed as base normal text
  const occurrences = new Map();

  const srcDir = path.join(themeRoot, 'src');
  if (!existsSync(srcDir)) {
    return { usedWeights, occurrences };
  }

  const files = [];
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.forgewp' && entry.name !== 'dist') {
            scanDir(full);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js|css|html)$/i.test(entry.name)) {
          files.push(full);
        }
      }
    } catch {}
  }
  scanDir(srcDir);

  // Also check globals.css or main css files in root
  const globalCss = path.join(themeRoot, 'src', 'app', 'globals.css');
  if (existsSync(globalCss) && !files.includes(globalCss)) {
    files.push(globalCss);
  }

  for (const file of files) {
    let content = '';
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    // 1. Scan standard Tailwind font weight utility classes
    for (const [cls, weight] of Object.entries(TAILWIND_WEIGHT_MAP)) {
      const regex = new RegExp(`\\b${cls}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        usedWeights.add(weight);
        occurrences.set(weight, (occurrences.get(weight) || 0) + matches.length);
      }
    }

    // 2. Scan arbitrary Tailwind classes like font-[500] or font-[600]
    const arbitraryRegex = /\bfont-\[(\d{3})\]/g;
    let arbMatch;
    while ((arbMatch = arbitraryRegex.exec(content)) !== null) {
      const weight = Number(arbMatch[1]);
      if (weight >= 100 && weight <= 900) {
        usedWeights.add(weight);
        occurrences.set(weight, (occurrences.get(weight) || 0) + 1);
      }
    }

    // 3. Scan CSS font-weight declarations (e.g. font-weight: 600 or fontWeight: 600)
    const cssWeightRegex = /(?:font-weight|fontWeight)\s*[:=]\s*['"]?(\d{3}|bold|normal|light|thin|black)['"]?/gi;
    let cssMatch;
    while ((cssMatch = cssWeightRegex.exec(content)) !== null) {
      const val = cssMatch[1].toLowerCase();
      const weight =
        val === 'bold'
          ? 700
          : val === 'normal'
            ? 400
            : val === 'light'
              ? 300
              : val === 'thin'
                ? 100
                : val === 'black'
                  ? 900
                  : Number(val);
      if (weight >= 100 && weight <= 900) {
        usedWeights.add(weight);
        occurrences.set(weight, (occurrences.get(weight) || 0) + 1);
      }
    }
  }

  return { usedWeights, occurrences };
}

/**
 * Extract structured family names and declared weights from config.
 *
 * @param {Array<string>|Object} configFonts
 * @returns {Array<{ family: string, weights: number[] }>}
 */
export function extractConfiguredWeights(configFonts) {
  if (!configFonts) return [];
  const rawList = Array.isArray(configFonts)
    ? configFonts
    : configFonts.families || [];

  const results = [];

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const [name, rest] = item.split(':');
    const family = name.replace(/\+/g, ' ').trim();
    const weights = [];

    if (rest) {
      // Find all 3-digit weights in the string (e.g. wght@300;400;500 or 0,400;0,500)
      const weightMatches = rest.match(/\b([1-9]00)\b/g);
      if (weightMatches) {
        for (const w of weightMatches) {
          const num = Number(w);
          if (!weights.includes(num)) {
            weights.push(num);
          }
        }
      }
    } else {
      weights.push(400);
    }

    results.push({ family, weights });
  }

  return results;
}

/**
 * Detect configured font weights that are declared in wp.config.ts but never used in the project source.
 *
 * @param {Array<string>|Object} configFonts
 * @param {Set<number>} usedWeights
 * @returns {Array<{ family: string, weight: number, sizeKb: number, reason: string }>}
 */
export function detectUnusedConfiguredWeights(configFonts, usedWeights) {
  const configured = extractConfiguredWeights(configFonts);
  const unused = [];

  for (const entry of configured) {
    for (const weight of entry.weights) {
      // 400 is considered default base text
      if (weight === 400) continue;

      if (!usedWeights.has(weight)) {
        unused.push({
          family: entry.family,
          weight,
          sizeKb: 22.5, // Average WOFF2 font slice size
          reason: `Declared in wp.config.ts but no 'font-${getTailwindName(weight)}' or font-weight ${weight} found in src/`,
        });
      }
    }
  }

  return unused;
}

function getTailwindName(weight) {
  switch (weight) {
    case 100: return 'thin';
    case 200: return 'extralight';
    case 300: return 'light';
    case 500: return 'medium';
    case 600: return 'semibold';
    case 700: return 'bold';
    case 800: return 'extrabold';
    case 900: return 'black';
    default: return String(weight);
  }
}

/**
 * Detect unused font weights from downloaded font rules.
 */
export function detectUnusedFontWeights(enrichedFontRules, usedWeights) {
  if (!Array.isArray(enrichedFontRules) || enrichedFontRules.length === 0) {
    return [];
  }

  const unused = [];
  const seen = new Set();

  for (const rule of enrichedFontRules) {
    const numWeight = Number(rule.weight);
    if (isNaN(numWeight)) continue;

    if (numWeight === 400) continue;

    if (!usedWeights.has(numWeight)) {
      const key = `${rule.family}-${rule.weight}`;
      if (!seen.has(key)) {
        seen.add(key);
        let sizeBytes = 0;
        if (rule.localPath && existsSync(rule.localPath)) {
          try {
            sizeBytes = statSync(rule.localPath).size;
          } catch {}
        }
        const sizeKb = sizeBytes > 0 ? Number((sizeBytes / 1024).toFixed(1)) : 22.5;

        unused.push({
          family: rule.family,
          weight: numWeight,
          style: rule.style,
          filename: rule.filename,
          localPath: rule.localPath,
          sizeBytes,
          sizeKb,
        });
      }
    }
  }

  return unused;
}
