import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { readComponentSource } from "../hydration/is-interactive.js";

/** @type {{ message: string, code?: string }[]} */
let editableIssues = [];

export function resetEditableIssues() {
  editableIssues = [];
}

export function getEditableIssues() {
  return editableIssues.slice();
}

/**
 * Record an editable/pick issue. Always logs a warning (deduped).
 * With `forgewp export --strict`, {@link flushEditableIssues} turns these into a hard failure.
 */
export function reportEditableIssue(message, code = 'editable') {
  if (editableIssues.some((i) => i.message === message)) return;
  editableIssues.push({ message, code });
  console.warn(`[ForgeWP] ${message}`);
}

/**
 * After scanning: no-op unless strict — then throw if any issues were reported.
 * @param {{ strict?: boolean }} [opts]
 */
export function flushEditableIssues(opts = {}) {
  const issues = getEditableIssues();
  if (opts.strict && issues.length > 0) {
    const detail = issues.map((i) => `  - ${i.message}`).join('\n');
    throw new Error(
      `Editable schema errors (${issues.length}) in strict mode:\n${detail}\n` +
        `Fix from/pick/pickEditable issues, or omit --strict to continue with warnings only.`,
    );
  }
  return issues;
}

/**
 * Read a `@forgewp-block` meta line (`title:`, `category:`, …) from a single JSDoc body.
 * Ignores code-like values accidentally captured (quoted keys, trailing commas).
 */
export function parseJsdocMetaLine(jsdoc, key) {
  if (!jsdoc || !key) return '';
  const re = new RegExp(
    `^[ \\t]*\\*?[ \\t]*${key}[ \\t]*:[ \\t]*(.+?)[ \\t]*$`,
    'im',
  );
  const m = jsdoc.match(re);
  if (!m) return '';
  let val = m[1].trim();
  // Trailing comma from object/property lookalikes
  val = val.replace(/,+\s*$/, '');
  // Pure string-literal values that look like schema keys, not human titles:
  // 'hero_title' / "featured_subtitle" — reject for title; keep for icon slugs etc.
  if (key === 'title' || key === 'description') {
    if (/^['"`]/.test(val) && /['"`]$/.test(val)) {
      // Allow normal quoted titles only if they contain spaces or capitals beyond snake_case
      const inner = val.slice(1, -1);
      if (/^[a-z0-9_]+$/.test(inner)) return '';
      val = inner;
    }
  }
  // Strip wrapping quotes on human titles: "Hero Section"
  if (
    (key === 'title' || key === 'description' || key === 'category' || key === 'icon') &&
    ((val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"')))
  ) {
    val = val.slice(1, -1);
  }
  return val.trim();
}

/**
 * Normalize schema/page slugs for cms/editables lookup.
 * BerUnsPage / ber_uns_page / ber-uns-page → ber-uns-page
 */
export function normalizeEditableSlug(slug) {
  if (!slug || typeof slug !== 'string') return slug;
  return slug
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Scans the theme's src/ folder recursively for components annotated with @forgewp-block
 * and scaffolds wrapper blocks inside src/blocks/generated/
 *
 * @param {string} themeRoot
 * @param {{ strict?: boolean, resetIssues?: boolean, flush?: boolean }} [options]
 *   - strict: fail after scan if any from/pick issues (default false — warn only)
 *   - resetIssues: clear issue buffer before scan (default true)
 *   - flush: run flushEditableIssues at end (default true). Set false when compileBlocks will flush later.
 */
export function scanAndGenerateBlocks(themeRoot, options = {}) {
  const { strict = false, resetIssues = true, flush = true } = options;
  if (resetIssues) resetEditableIssues();

  const srcDir = path.join(themeRoot, 'src');
  if (!existsSync(srcDir)) {
    if (flush) flushEditableIssues({ strict });
    return;
  }

  const generatedDir = path.join(srcDir, 'blocks', 'generated');
  const handcraftedDir = path.join(srcDir, 'blocks');

  // Collect all files recursively in src/, excluding blocks/generated/ and other build artifacts
  const files = [];
  function collectFiles(dir) {
    if (!existsSync(dir)) return;
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (['node_modules', '.forgewp', 'generated', 'dist', '.git', 'out'].includes(item.name)) {
          continue;
        }
        collectFiles(fullPath);
      } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.jsx'))) {
        files.push(fullPath);
      }
    }
  }
  collectFiles(srcDir);

  const activeGeneratedFiles = new Set();

  for (const file of files) {
    try {
      const content = readComponentSource(file);
      if (!content.includes('@forgewp-block')) continue;

      // Match each JSDoc that contains @forgewp-block *inside that same comment*.
      // Do NOT use /\/\*\*([\s\S]*?@forgewp-block...)/ — that spans from an earlier
      // /** through source (e.g. pick maps `title: 'hero_title'`) and steals them
      // as the block title / description. Developers may put any /** above the block.
      const blockRegex =
        /\/\*\*((?:(?!\*\/)[\s\S])*?@forgewp-block(?:(?!\*\/)[\s\S])*?)\*\/[\s\r\n]*(?:export\s+(?:interface|type)\s+[A-Za-z0-9_$-]+\s*=?\s*\{[\s\S]*?\}[\s\r\n]*)?export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_$-]+)/g;
      let match;
      while ((match = blockRegex.exec(content)) !== null) {
        const jsdoc = match[1];
        if (!jsdoc.includes('@forgewp-block')) continue;

        const compName = match[2];

        // Meta lines only (` * title: Hero Section`). Not code-like `title: 'x',`.
        const title = parseJsdocMetaLine(jsdoc, 'title') || compName;
        const category = parseJsdocMetaLine(jsdoc, 'category') || 'design';
        const description = parseJsdocMetaLine(jsdoc, 'description') || '';
        const icon = parseJsdocMetaLine(jsdoc, 'icon') || 'admin-generic';

        // Attributes: prefer page schema via JSDoc from/pick or pickEditable / defineEditable
        let attributes = {};
        const pickedSchema = resolveComponentEditableSchema(content, file, themeRoot);
        if (pickedSchema && Object.keys(pickedSchema).length > 0) {
          for (const [key, field] of Object.entries(pickedSchema)) {
            attributes[key] = mapEditableFieldToAttribute(field);
          }
        } else {
          attributes = inferAttributes(content, compName);
        }

        // Slugify component name for WordPress block name
        const blockSlug = compName
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');

        // Check if handcrafted block exists (escape hatch)
        const handcraftedFile = path.join(handcraftedDir, `${compName}Block.tsx`);
        const handcraftedFileAlt = path.join(handcraftedDir, `${compName}.tsx`);
        const handcraftedFileFolder = path.join(handcraftedDir, compName, 'index.tsx');
        if (existsSync(handcraftedFile) || existsSync(handcraftedFileAlt) || existsSync(handcraftedFileFolder)) {
          continue;
        }

        // Generate wrapper TSX
        const relativeImportPath = getRelativeImportPath(generatedDir, file);

        // Check if named or default export is used
        const isDefaultExport = new RegExp(`export\\s+default\\s+(?:function|const)\\s+${compName}\\b`).test(content) ||
                                new RegExp(`export\\s+default\\s+${compName}\\b`).test(content);
        const importStatement = isDefaultExport
          ? `import ${compName} from "${relativeImportPath}";`
          : `import { ${compName} } from "${relativeImportPath}";`;

        // Re-export editable when the source defines/picks a schema in code
        const hasCodeEditable =
          content.includes('defineEditable(') ||
          content.includes('pickEditable(') ||
          content.includes('mergeEditable(') ||
          /export\s+\{\s*[^}]*\beditable\b/.test(content);
        const extraExports = hasCodeEditable
          ? `\nexport { editable } from "${relativeImportPath}";`
          : '';

        const attrStrings = [];
        for (const [key, attr] of Object.entries(attributes)) {
          const parts = [`type: ${JSON.stringify(attr.type || 'string')}`];
          if (attr.default !== undefined) parts.push(`default: ${JSON.stringify(attr.default)}`);
          if (attr.control) parts.push(`control: ${JSON.stringify(attr.control)}`);
          if (attr.label) parts.push(`label: ${JSON.stringify(attr.label)}`);
          if (attr.options) parts.push(`options: ${JSON.stringify(attr.options)}`);
          if (attr.provider) parts.push(`provider: ${JSON.stringify(attr.provider)}`);
          if (attr.mode) parts.push(`mode: ${JSON.stringify(attr.mode)}`);
          if (attr.min !== undefined) parts.push(`min: ${JSON.stringify(attr.min)}`);
          if (attr.max !== undefined) parts.push(`max: ${JSON.stringify(attr.max)}`);
          if (attr.fields) parts.push(`fields: ${JSON.stringify(attr.fields)}`);
          attrStrings.push(`    ${key}: { ${parts.join(', ')} }`);
        }
        const attributesCode = attrStrings.length > 0
          ? `{\n${attrStrings.join(',\n')}\n  }`
          : '{}';

        const wrapperCode = `// AUTO-GENERATED BY FORGEWP. DO NOT EDIT DIRECTLY.
import { defineBlock } from "@forgewp/react";
${importStatement}${extraExports}

export default defineBlock({
  name: ${JSON.stringify(blockSlug)},
  title: ${JSON.stringify(title)},
  category: ${JSON.stringify(category)},
  description: ${JSON.stringify(description)},
  icon: ${JSON.stringify(icon)},
  attributes: ${attributesCode},
  edit: (props: any) => {
    return <${compName} {...props.attributes} setAttributes={props.setAttributes} />;
  }
});

`;

        const genFilePath = path.join(generatedDir, `${compName}Block.tsx`);
        mkdirSync(generatedDir, { recursive: true });
        
        // Write only if content changed to prevent unnecessary hot-reloads
        let shouldWrite = true;
        if (existsSync(genFilePath)) {
          const existingCode = readFileSync(genFilePath, 'utf8');
          if (existingCode === wrapperCode) {
            shouldWrite = false;
          }
        }
        if (shouldWrite) {
          writeFileSync(genFilePath, wrapperCode, 'utf8');
        }
        
        activeGeneratedFiles.add(`${compName}Block.tsx`);
      }
    } catch (err) {
      console.warn(`[JSDoc Block Scanner] Error scanning file ${file}:`, err.message);
    }
  }

  // Clean up unused/deleted generated blocks
  if (existsSync(generatedDir)) {
    const existingGenerated = readdirSync(generatedDir);
    for (const file of existingGenerated) {
      if (file.endsWith('.tsx') && !activeGeneratedFiles.has(file)) {
        console.log(`[ForgeWP Compiler] Cleaning up obsolete auto-generated block wrapper: src/blocks/generated/${file}`);
        try {
          rmSync(path.join(generatedDir, file));
        } catch {}
      }
    }
  }

  if (flush) flushEditableIssues({ strict });
}

/**
 * Infers block attribute specifications by parsing TS/JS props definitions
 */
function inferAttributes(content, compName) {
  const attrs = {};
  const reserved = ['setAttributes', 'attributes', 'clientId', 'isSelected', 'name', 'context', 'className', 'attrs'];

  // Pattern 1: search for interface/type named Props or ${compName}Props
  let body = null;
  const typeRegex = new RegExp(`(?:interface|type)\\s+(?:Props|${compName}Props)\\s*=?\\s*\\{`);
  const match = content.match(typeRegex);
  if (match) {
    const startIndex = match.index + match[0].length;
    let depth = 1;
    let i = startIndex;
    let tempBody = '';
    while (i < content.length && depth > 0) {
      const char = content[i];
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) break;
      }
      tempBody += char;
      i++;
    }
    body = tempBody;
  }

  if (body !== null) {
    // Strip nested object definitions so we do not extract nested properties as top-level attributes
    body = body.replace(/\{[\s\S]*?\}/g, '');
    const lineRegex = /([a-zA-Z0-9_-]+)\s*\??\s*:\s*([a-zA-Z0-9_|[\]\s'"\-]+)/g;
    let m;
    while ((m = lineRegex.exec(body)) !== null) {
      const name = m[1];
      if (reserved.includes(name)) continue;
      const typeStr = m[2].trim();
      attrs[name] = mapTypeToBlockAttribute(typeStr);
    }
    return attrs;
  }

  // Pattern 2: search for inline type signature e.g. function Hero({ heading, text }: { heading: string, text: string })
  const inlineRegex = new RegExp(`function\\s+${compName}\\s*\\(\\s*\\{[\\s\\S]*?\\}\\s*:\\s*\\{([\\s\\S]*?)\\}\\s*\\)`);
  const inlineMatch = content.match(inlineRegex);
  if (inlineMatch) {
    let body = inlineMatch[1];
    // Strip nested object definitions so we do not extract nested properties as top-level attributes
    body = body.replace(/\{[\s\S]*?\}/g, '');
    const propRegex = /([a-zA-Z0-9_-]+)\s*\??\s*:\s*([a-zA-Z0-9_|[\]\s'"\-]+)/g;
    let m;
    while ((m = propRegex.exec(body)) !== null) {
      const name = m[1];
      if (reserved.includes(name)) continue;
      const typeStr = m[2].trim();
      attrs[name] = mapTypeToBlockAttribute(typeStr);
    }
    return attrs;
  }

  return attrs;
}

function mapTypeToBlockAttribute(typeStr) {
  const lower = typeStr.toLowerCase();
  if (lower.includes('string')) {
    return { type: 'string', default: '' };
  }
  if (lower.includes('number')) {
    return { type: 'number', default: 0 };
  }
  if (lower.includes('boolean')) {
    return { type: 'boolean', default: false };
  }
  // Fallback to string
  return { type: 'string', default: '' };
}

function getRelativeImportPath(fromDir, toFile) {
  let relative = path.relative(fromDir, toFile).replace(/\\/g, '/');
  // Strip extension
  relative = relative.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (!relative.startsWith('.') && !relative.startsWith('/')) {
    relative = './' + relative;
  }
  return relative;
}

export function parseDefineBlock(code, blockSlug) {
  const startIndex = code.indexOf('defineBlock(');
  if (startIndex === -1) return null;

  let depth = 1;
  let i = startIndex + 'defineBlock('.length;
  let blockContent = '';

  while (i < code.length && depth > 0) {
    const char = code[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (depth > 0) {
      blockContent += char;
    }
    i++;
  }

  let cleanBlockContent = blockContent;

  const metaKeys =
    'save|name|title|category|icon|attributes|description|keywords|innerBlocks|shell';

  cleanBlockContent = cleanBlockContent.replace(
    new RegExp(
      `edit\\s*:\\s*([\\s\\S]*?)(?=,\\s*(?:${metaKeys})\\s*:|\\s*\\}$)`,
    ),
    'edit: null',
  );
  cleanBlockContent = cleanBlockContent.replace(
    new RegExp(
      `save\\s*:\\s*([\\s\\S]*?)(?=,\\s*(?:edit|${metaKeys})\\s*:|\\s*\\}$)`,
    ),
    'save: null',
  );

  try {
    const evalFn = new Function(`return (${cleanBlockContent});`);
    return evalFn();
  } catch (e) {
    console.warn(`[Gutenberg Block Compiler] parseDefineBlock eval failed:`, e.message);
    
    const nameMatch = blockContent.match(/name\s*:\s*["']([^"']+)["']/);
    const titleMatch = blockContent.match(/title\s*:\s*["']([^"']+)["']/);
    const categoryMatch = blockContent.match(/category\s*:\s*["']([^"']+)["']/);
    const iconMatch = blockContent.match(/icon\s*:\s*["']([^"']+)["']/);
    const descMatch = blockContent.match(/description\s*:\s*["']([^"']+)["']/);
    const keywordsMatch = blockContent.match(/keywords\s*:\s*(\[[^\]]*\])/);

    let keywords = [];
    if (keywordsMatch) {
      try {
        const keywordsEval = new Function(`return ${keywordsMatch[1]};`);
        keywords = keywordsEval();
      } catch {}
    }

    let attributes = {};
    const attrMatch = blockContent.match(/attributes\s*:\s*(\{[\s\S]*?\})(?:\s*,\s*(?:edit|save|innerBlocks|shell)|\s*\})/);
    if (attrMatch) {
      try {
        const attrEval = new Function(`return ${attrMatch[1]};`);
        attributes = attrEval();
      } catch {}
    }

    let innerBlocks = undefined;
    const ibMatch = blockContent.match(/innerBlocks\s*:\s*(\{[\s\S]*?\})(?:\s*,\s*(?:edit|save|shell|name|title|attributes)|\s*\})/);
    if (ibMatch) {
      try {
        innerBlocks = new Function(`return (${ibMatch[1]});`)();
      } catch {}
    }

    let shell = undefined;
    const shellMatch = blockContent.match(/shell\s*:\s*(\{[\s\S]*?\})(?:\s*,\s*(?:edit|save|innerBlocks|name|title|attributes)|\s*\})/);
    if (shellMatch) {
      try {
        shell = new Function(`return (${shellMatch[1]});`)();
      } catch {}
    }

    return {
      name: nameMatch ? nameMatch[1] : blockSlug,
      title: titleMatch ? titleMatch[1] : blockSlug,
      category: categoryMatch ? categoryMatch[1] : 'design',
      icon: iconMatch ? iconMatch[1] : 'info',
      description: descMatch ? descMatch[1] : '',
      keywords,
      attributes,
      ...(innerBlocks ? { innerBlocks } : {}),
      ...(shell ? { shell } : {}),
    };
  }
}

/** Normalize innerBlocks names to forgewp/* and sanitize template. */
export function normalizeInnerBlocksConfig(ib) {
  if (!ib || typeof ib !== 'object') return null;
  const ns = (n) => {
    if (!n || typeof n !== 'string') return n;
    return n.includes('/') ? n : `forgewp/${n}`;
  };
  const allowedBlocks = Array.isArray(ib.allowedBlocks)
    ? ib.allowedBlocks.map(ns)
    : undefined;
  const template = Array.isArray(ib.template)
    ? ib.template.map((row) => {
        if (!Array.isArray(row) || !row[0]) return null;
        return [ns(row[0]), row[1] && typeof row[1] === 'object' ? row[1] : {}];
      }).filter(Boolean)
    : undefined;
  return {
    allowedBlocks,
    template,
    templateLock: ib.templateLock === undefined ? false : ib.templateLock,
    orientation: ib.orientation === 'vertical' ? 'vertical' : 'horizontal',
  };
}

/**
 * Extract top-level `const NAME = <literal>` bindings from a source file so
 * defineEditable({ options: MY_CONST }) works without forcing inline literals.
 * Only pure data (arrays/objects/strings/numbers/booleans) is evaluated.
 */
export function extractFileConstBindings(sourceCode) {
  const bindings = {};
  if (!sourceCode) return bindings;

  // Match export const / const Name = ... at start of a statement
  const declRx = /(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*/g;
  let m;
  while ((m = declRx.exec(sourceCode)) !== null) {
    const name = m[1];
    // Skip React components / functions
    if (/^[A-Z]/.test(name) && name.endsWith('Props')) continue;

    let pos = m.index + m[0].length;
    // Skip leading whitespace
    while (pos < sourceCode.length && /\s/.test(sourceCode[pos])) pos++;
    if (pos >= sourceCode.length) continue;

    const startChar = sourceCode[pos];
    // Only auto-eval data literals — not function/arrow/class/jsx
    if (
      startChar !== '[' &&
      startChar !== '{' &&
      startChar !== '"' &&
      startChar !== "'" &&
      startChar !== '`' &&
      !/[0-9.-]/.test(startChar) &&
      !sourceCode.startsWith('true', pos) &&
      !sourceCode.startsWith('false', pos) &&
      !sourceCode.startsWith('null', pos)
    ) {
      continue;
    }

    let end = pos;
    if (startChar === '[' || startChar === '{') {
      const open = startChar;
      const close = open === '[' ? ']' : '}';
      let depth = 0;
      let inS = false;
      let inD = false;
      let inB = false;
      for (let i = pos; i < sourceCode.length; i++) {
        const c = sourceCode[i];
        if (inS) {
          if (c === '\\') {
            i++;
            continue;
          }
          if (c === "'") inS = false;
          continue;
        }
        if (inD) {
          if (c === '\\') {
            i++;
            continue;
          }
          if (c === '"') inD = false;
          continue;
        }
        if (inB) {
          if (c === '\\') {
            i++;
            continue;
          }
          if (c === '`') inB = false;
          continue;
        }
        if (c === "'") inS = true;
        else if (c === '"') inD = true;
        else if (c === '`') inB = true;
        else if (c === open) depth++;
        else if (c === close) {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    } else if (startChar === '"' || startChar === "'" || startChar === '`') {
      const q = startChar;
      end = pos + 1;
      while (end < sourceCode.length) {
        if (sourceCode[end] === '\\') {
          end += 2;
          continue;
        }
        if (sourceCode[end] === q) {
          end++;
          break;
        }
        end++;
      }
    } else {
      // number / true / false / null
      const rest = sourceCode.slice(pos);
      const lit = rest.match(/^(true|false|null|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i);
      if (!lit) continue;
      end = pos + lit[0].length;
    }

    const rawValue = sourceCode.slice(pos, end).trim();
    try {
      // Evaluate pure JSON-ish / JS literal expressions
      const value = new Function(`return (${rawValue});`)();
      bindings[name] = value;
    } catch {
      // Not a pure literal — skip (dev can still inline)
    }
  }

  return bindings;
}

/**
 * Apply a pick map to a page/section schema.
 * map: { blockAttr: 'page_schema_key' } or ['same_key', ...]
 * @param {Record<string, any>} schema
 * @param {Record<string, string>|string[]} map
 * @param {{ context?: string }} [meta] for warning messages
 */
export function applyEditablePickMap(schema, map, meta = {}) {
  if (!schema || typeof schema !== 'object') return null;
  const ctx = meta.context ? ` (${meta.context})` : '';
  const out = {};
  if (Array.isArray(map)) {
    for (const key of map) {
      if (schema[key]) {
        out[key] = schema[key];
      } else {
        reportEditableIssue(
          `pick key "${key}" not found in schema${ctx}`,
          'pick-missing-key',
        );
      }
    }
    return out;
  }
  if (map && typeof map === 'object') {
    for (const [attrKey, schemaKey] of Object.entries(map)) {
      if (!schemaKey) continue;
      if (schema[schemaKey]) {
        out[attrKey] = schema[schemaKey];
      } else {
        reportEditableIssue(
          `pick maps "${attrKey}" ← "${schemaKey}" but "${schemaKey}" is not in schema${ctx}`,
          'pick-missing-key',
        );
      }
    }
  }
  return out;
}

/**
 * Parse JSDoc pick specs:
 *   pick: hero_badge as badge, hero_title as title
 *   pick: hero_badge→badge, hero_title→title
 *   pick: title, subtitle   (same keys)
 * Multi-line continuation lines under pick: are also collected.
 */
export function parseJsdocPickSpec(jsdoc) {
  const lines = jsdoc.split(/\r?\n/).map((l) => l.replace(/^\s*\*\s?/, '').trim());
  let pickBlob = '';
  let capturing = false;
  for (const line of lines) {
    const pickStart = line.match(/^pick\s*:\s*(.*)$/i);
    if (pickStart) {
      capturing = true;
      pickBlob += (pickBlob ? ', ' : '') + pickStart[1];
      continue;
    }
    if (capturing) {
      if (!line || /^(title|category|description|icon|from|name)\s*:/i.test(line) || line.startsWith('@')) {
        capturing = false;
        continue;
      }
      pickBlob += ', ' + line.replace(/,\s*$/, '');
    }
  }
  if (!pickBlob.trim()) return null;

  const map = {};
  const parts = pickBlob.split(',').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    // schemaKey as attrKey | schemaKey→attrKey | schemaKey -> attrKey
    const asMatch = part.match(/^([a-zA-Z0-9_]+)\s+(?:as|→|->)\s+([a-zA-Z0-9_]+)$/i);
    if (asMatch) {
      map[asMatch[2]] = asMatch[1];
      continue;
    }
    const arrow = part.match(/^([a-zA-Z0-9_]+)\s*→\s*([a-zA-Z0-9_]+)$/);
    if (arrow) {
      map[arrow[2]] = arrow[1];
      continue;
    }
    // bare key: same name
    if (/^[a-zA-Z0-9_]+$/.test(part)) {
      map[part] = part;
    }
  }
  return Object.keys(map).length ? map : null;
}

export function parseJsdocFromSlug(jsdoc) {
  const m = jsdoc.match(/\bfrom\s*:\s*([a-zA-Z0-9_-]+)/i);
  return m ? normalizeEditableSlug(m[1].trim()) : null;
}

/**
 * Load defineEditable schema from cms/editables/<slug>.ts (or legacy paths).
 * Accepts PascalCase / snake_case / kebab-case slugs (normalized).
 */
export function loadPageEditableSchema(themeRoot, fromSlug, meta = {}) {
  if (!themeRoot || !fromSlug) return null;
  const slug = normalizeEditableSlug(fromSlug);
  const candidates = [
    path.join(themeRoot, 'cms', 'editables', `${slug}.ts`),
    path.join(themeRoot, 'cms', 'editables', `${slug}.tsx`),
    path.join(themeRoot, 'src', 'cms', 'editables', `${slug}.ts`),
    path.join(themeRoot, 'src', 'cms', 'editables', `${slug}.tsx`),
    path.join(themeRoot, 'src', 'editables', `${slug}.ts`),
    path.join(themeRoot, 'src', 'editables', `${slug}.tsx`),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const code = readFileSync(p, 'utf8');
    const schema = parseDefineEditable(code);
    if (schema) return schema;
  }
  const ctx = meta.context ? ` in ${meta.context}` : '';
  reportEditableIssue(
    `Could not load editable schema from: "${fromSlug}" (resolved as "${slug}")${ctx}. Expected cms/editables/${slug}.ts`,
    'from-missing-schema',
  );
  return null;
}

/**
 * Resolve editable schema for a component/block source file:
 *  1. export const editable = mergeEditable(...)  — content pick + block-only layout
 *  2. export const editable = defineEditable(...)
 *  3. export const editable = pickEditable(importId, map)
 *  4. export { editable } from '...'
 *  5. JSDoc @forgewp-block from: + pick:
 */
export function resolveComponentEditableSchema(code, filePath, themeRoot) {
  if (!code) return null;

  // 1. mergeEditable(pick…, { blockOnly… }) — page content + block-only layout fields
  if (code.includes('mergeEditable(') && /export\s+const\s+editable\s*=\s*mergeEditable\s*\(/.test(code)) {
    const merged = parseMergeEditableCall(code, filePath, themeRoot);
    if (merged && Object.keys(merged).length) return merged;
  }

  // 2. Inline defineEditable
  if (code.includes('defineEditable(') && /export\s+const\s+editable\s*=\s*defineEditable\s*\(/.test(code)) {
    // Prefer the exported editable assignment if multiple defineEditable calls exist
    const schema = parseDefineEditable(code);
    if (schema) return schema;
  }

  // 3. pickEditable(ref, map)
  const pickSchema = parsePickEditableCall(code, filePath, themeRoot);
  if (pickSchema) return pickSchema;

  // 4. Re-export
  const exportMatch = code.match(/export\s+\{\s*[^}]*\beditable\b[^}]*\}\s+from\s+['"]([^'"]+)['"]/);
  if (exportMatch) {
    const resolved = resolveModulePath(path.dirname(filePath), exportMatch[1]);
    if (resolved) {
      const editableCode = readFileSync(resolved, 'utf8');
      return resolveComponentEditableSchema(editableCode, resolved, themeRoot);
    }
  }

  // 5. JSDoc from + pick on @forgewp-block (same-comment only — see scanAndGenerateBlocks)
  if (code.includes('@forgewp-block') && code.includes('from:') && /pick\s*:/i.test(code)) {
    const jsdocMatch = code.match(
      /\/\*\*((?:(?!\*\/)[\s\S])*?@forgewp-block(?:(?!\*\/)[\s\S])*?)\*\//,
    );
    if (jsdocMatch) {
      const jsdoc = jsdocMatch[1];
      const fromSlug = parseJsdocFromSlug(jsdoc);
      const pickMap = parseJsdocPickSpec(jsdoc);
      const rel = filePath ? path.relative(themeRoot || '', filePath) : filePath;
      if (fromSlug && pickMap) {
        const pageSchema = loadPageEditableSchema(themeRoot, fromSlug, {
          context: rel || 'JSDoc from/pick',
        });
        if (pageSchema) {
          const picked = applyEditablePickMap(pageSchema, pickMap, {
            context: `${rel || 'component'} from:${fromSlug}`,
          });
          if (picked && Object.keys(picked).length) return picked;
          reportEditableIssue(
            `from/pick produced no attributes for ${rel || 'component'} (from: ${fromSlug})`,
            'pick-empty',
          );
        }
      } else if (fromSlug && !pickMap) {
        reportEditableIssue(
          `JSDoc from: "${fromSlug}" without a valid pick: list in ${rel || 'component'}`,
          'pick-missing',
        );
      }
    }
  }

  return null;
}

/**
 * Split a comma-separated argument list, respecting nested () [] {} and strings.
 */
function splitTopLevelArgs(src) {
  const args = [];
  let cur = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inStr = null;
  let escape = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      cur += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inStr) {
        inStr = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen--;
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket--;
    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      if (cur.trim()) args.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/**
 * Eval a field-object literal with the same helpers as defineEditable.
 */
function evalEditableObjectLiteral(objSrc, fileCode) {
  try {
    const text = (opts = {}) => ({ type: 'text', ...opts });
    const richText = (opts = {}) => ({ type: 'richText', ...opts });
    const image = (opts = {}) => ({ type: 'image', ...opts });
    const boolean = (opts = {}) => ({ type: 'boolean', ...opts });
    const repeater = (opts = {}) => ({ type: 'repeater', ...opts });
    const color = (opts = {}) => ({ type: 'color', ...opts });
    const url = (opts = {}) => ({ type: 'url', ...opts });
    const select = (opts = {}) => ({ type: 'select', ...opts });
    const number = (opts = {}) => ({ type: 'number', ...opts });
    const icon = (opts = {}) => ({ type: 'icon', provider: 'lucide', ...opts });
    const fileBindings = extractFileConstBindings(fileCode || '');
    const bindingNames = Object.keys(fileBindings);
    const helperNames = [
      'text', 'richText', 'image', 'boolean', 'repeater', 'color', 'url', 'select', 'number', 'icon',
    ];
    const helpers = [text, richText, image, boolean, repeater, color, url, select, number, icon];
    const evalFn = new Function(
      ...helperNames,
      ...bindingNames,
      `return (${objSrc});`,
    );
    return evalFn(...helpers, ...bindingNames.map((n) => fileBindings[n]));
  } catch (e) {
    reportEditableIssue(
      `mergeEditable object literal eval failed: ${e.message}`,
      'merge-eval',
    );
    return null;
  }
}

/**
 * Parse `export const editable = mergeEditable(pickEditable(...), { paddingY: select(...) })`.
 * Later parts override earlier keys.
 */
export function parseMergeEditableCall(code, filePath, themeRoot) {
  const exportMatch = code.match(/export\s+const\s+editable\s*=\s*mergeEditable\s*\(/);
  if (!exportMatch || exportMatch.index === undefined) return null;

  const start = exportMatch.index + exportMatch[0].length;
  let depth = 1;
  let i = start;
  let body = '';
  while (i < code.length && depth > 0) {
    const char = code[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (depth > 0) body += char;
    i++;
  }

  const args = splitTopLevelArgs(body);
  const result = {};
  for (const arg of args) {
    if (!arg) continue;
    if (/^pickEditable\s*\(/.test(arg)) {
      const partial = parsePickEditableExpression(arg, code, filePath, themeRoot);
      if (partial) Object.assign(result, partial);
      continue;
    }
    if (/^defineEditable\s*\(/.test(arg)) {
      const partial = parseDefineEditable(arg);
      if (partial) Object.assign(result, partial);
      continue;
    }
    if (arg.startsWith('{')) {
      const partial = evalEditableObjectLiteral(arg, code);
      if (partial && typeof partial === 'object') Object.assign(result, partial);
      continue;
    }
    reportEditableIssue(
      `mergeEditable: unsupported argument in ${filePath}: ${arg.slice(0, 60)}…`,
      'merge-arg',
    );
  }
  return Object.keys(result).length ? result : null;
}

function resolveModulePath(fromDir, importPath) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    let p = path.resolve(fromDir, importPath + ext);
    if (existsSync(p)) return p;
    p = path.resolve(fromDir, importPath, 'index' + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Parse a pickEditable(...) expression (export assignment or mergeEditable arg).
 */
export function parsePickEditableExpression(expr, fileCode, filePath, themeRoot) {
  const m = expr.match(
    /pickEditable\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\)\s*$/,
  );
  if (!m) {
    // Non-greedy inner match for nested braces in map
    const m2 = expr.match(/pickEditable\s*\(\s*([A-Za-z_$][\w$]*)\s*,/);
    if (!m2) return null;
    const afterComma = expr.indexOf(',', m2.index + m2[0].length - 1);
    if (afterComma < 0) return null;
    let depth = 0;
    let start = -1;
    let end = -1;
    for (let i = afterComma + 1; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '{' || ch === '[') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (start < 0 || end < 0) return null;
    return parsePickEditableExpression(
      `pickEditable(${m2[1]}, ${expr.slice(start, end)})`,
      fileCode,
      filePath,
      themeRoot,
    );
  }

  const refName = m[1];
  let map;
  try {
    map = new Function(`return (${m[2]});`)();
  } catch (e) {
    reportEditableIssue(
      `pickEditable map eval failed in ${filePath}: ${e.message}`,
      'pick-eval',
    );
    return null;
  }

  let schemaPath = null;
  const importRe =
    /import\s+(?:(\w+)|\{([^}]*)\})\s+from\s+['"]([^'"]+)['"]/g;
  let im;
  while ((im = importRe.exec(fileCode)) !== null) {
    const defaultImp = im[1];
    const named = im[2];
    const from = im[3];
    if (defaultImp === refName) {
      schemaPath = resolveModulePath(path.dirname(filePath), from);
      break;
    }
    if (named) {
      for (const part of named.split(',')) {
        const bits = part.trim().split(/\s+as\s+/);
        const orig = bits[0].trim();
        const local = (bits[1] || bits[0]).trim();
        if (local === refName || orig === refName) {
          schemaPath = resolveModulePath(path.dirname(filePath), from);
          break;
        }
      }
      if (schemaPath) break;
    }
  }

  if (!schemaPath) {
    reportEditableIssue(
      `pickEditable: could not resolve import for "${refName}" in ${filePath}`,
      'pick-import',
    );
    return null;
  }

  const schemaCode = readFileSync(schemaPath, 'utf8');
  let schema = parseDefineEditable(schemaCode);
  if (!schema) {
    schema = resolveComponentEditableSchema(schemaCode, schemaPath, themeRoot);
  }
  if (!schema) {
    reportEditableIssue(
      `pickEditable: no defineEditable schema in ${schemaPath} (from ${filePath})`,
      'pick-empty-schema',
    );
    return null;
  }
  return applyEditablePickMap(schema, map, {
    context: `pickEditable in ${filePath}`,
  });
}

/**
 * Extract pick map object: attrKey → metaKey from pickEditable(ref, { ... }).
 * Used for dual-host sync of block attributes → post meta on save.
 * @returns {Record<string, string>|null}
 */
export function extractPickAttrMetaMap(code) {
  if (!code || !code.includes('pickEditable')) return null;
  // Prefer map inside mergeEditable(pickEditable(...), ...) or bare pickEditable export
  const re = /pickEditable\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*(\{)/g;
  let m;
  let lastMap = null;
  while ((m = re.exec(code)) !== null) {
    const braceStart = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) continue;
    const lit = code.slice(braceStart, end);
    try {
      const map = new Function(`return (${lit});`)();
      if (map && typeof map === 'object' && !Array.isArray(map)) {
        // Only keep string→string mappings (attr → meta key)
        const out = {};
        for (const [k, v] of Object.entries(map)) {
          if (typeof v === 'string' && v) out[k] = v;
        }
        if (Object.keys(out).length) lastMap = out;
      }
    } catch {
      // ignore
    }
  }
  return lastMap;
}

/**
 * Parse `export const editable = pickEditable(identifier, { ... } | [...])`
 * and resolve identifier via import.
 */
export function parsePickEditableCall(code, filePath, themeRoot) {
  const m = code.match(
    /export\s+const\s+editable\s*=\s*(pickEditable\s*\([\s\S]*\))\s*;?/,
  );
  if (!m) return null;
  // Trim to balanced pickEditable(...)
  const exprStart = m[0].indexOf('pickEditable');
  const fromPick = m[0].slice(exprStart);
  let depth = 0;
  let end = -1;
  for (let i = 0; i < fromPick.length; i++) {
    if (fromPick[i] === '(') depth++;
    else if (fromPick[i] === ')') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  return parsePickEditableExpression(fromPick.slice(0, end), code, filePath, themeRoot);
}

export function parseDefineEditable(code) {
  const startIndex = code.indexOf('defineEditable(');
  if (startIndex === -1) return null;

  let depth = 1;
  let i = startIndex + 'defineEditable('.length;
  let editableContent = '';

  while (i < code.length && depth > 0) {
    const char = code[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (depth > 0) {
      editableContent += char;
    }
    i++;
  }

  try {
    const text = (opts = {}) => ({ type: 'text', ...opts });
    const richText = (opts = {}) => ({ type: 'richText', ...opts });
    const image = (opts = {}) => ({ type: 'image', ...opts });
    const boolean = (opts = {}) => ({ type: 'boolean', ...opts });
    const repeater = (opts = {}) => ({ type: 'repeater', ...opts });
    const color = (opts = {}) => ({ type: 'color', ...opts });
    const url = (opts = {}) => ({ type: 'url', ...opts });
    const select = (opts = {}) => ({ type: 'select', ...opts });
    const number = (opts = {}) => ({ type: 'number', ...opts });
    const icon = (opts = {}) => ({ type: 'icon', provider: 'lucide', ...opts });

    // Inject same-file const bindings so options: ICON_ALLOWLIST works naturally
    const fileBindings = extractFileConstBindings(code);
    const bindingNames = Object.keys(fileBindings);
    const helperNames = [
      'text', 'richText', 'image', 'boolean', 'repeater', 'color', 'url', 'select', 'number', 'icon',
    ];
    const helpers = [text, richText, image, boolean, repeater, color, url, select, number, icon];

    const evalFn = new Function(
      ...helperNames,
      ...bindingNames,
      `return (${editableContent});`,
    );
    return evalFn(...helpers, ...bindingNames.map((n) => fileBindings[n]));
  } catch (e) {
    console.warn(`[Gutenberg Block Compiler] parseDefineEditable eval failed:`, e.message);
    return null;
  }
}

export function mapEditableFieldToAttribute(field) {
  const typeMap = {
    text: { type: 'string', control: 'text' },
    richText: { type: 'string', control: 'richText' },
    image: { type: 'object', control: 'image' },
    color: { type: 'string', control: 'color' },
    url: { type: 'string', control: 'url' },
    boolean: { type: 'boolean', control: 'toggle' },
    select: { type: 'string', control: 'select' },
    number: { type: 'number', control: 'number' },
    icon: { type: 'string', control: 'icon' },
    repeater: { type: 'array', control: 'repeater' },
  };

  const attr = { ...(typeMap[field.type] || { type: 'string', control: 'text' }) };

  if (field.label) attr.label = field.label;
  if (field.default !== undefined) {
    attr.default = field.default;
  } else if (attr.type === 'object') {
    attr.default = null;
  } else if (attr.type === 'array') {
    attr.default = [];
  } else if (field.type === 'icon' && attr.default === undefined) {
    attr.default = 'star';
  }
  if (field.options) attr.options = field.options;
  if (field.provider) attr.provider = field.provider;
  if (field.min !== undefined) attr.min = field.min;
  if (field.max !== undefined) attr.max = field.max;
  if (field.mode) attr.mode = field.mode;
  if (field.type === 'repeater' && !attr.mode) {
    attr.mode = 'dynamic';
  }
  if (field.fields) {
    // Normalize nested field defs so the editor can read control/type/label consistently
    const nested = {};
    for (const [subKey, subField] of Object.entries(field.fields)) {
      nested[subKey] = mapEditableFieldToAttribute(subField);
    }
    attr.fields = nested;
  }

  return attr;
}
