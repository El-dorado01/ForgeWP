import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Scans for `defineEditable` schemas used as page/template ACF field groups.
 *
 * Sources (later wins on same slug):
 *  1. Colocated `export const editable` under `src/app/**` (legacy)
 *  2. `src/editables/**` (legacy short path)
 *  3. `src/cms/editables/**`
 *  4. `cms/editables/**` (preferred — sits with mock-data / theme CMS)
 *
 * Section files under editables/sections/ are block schemas only
 * (not registered as page ACF groups). Page files compose them via
 * buildPageEditable / pageEditableSections or a normal defineEditable.
 *
 * @param {string} themeRoot
 * @returns {Record<string, Record<string, any>>} template/page slug → parsed schema
 */
export function scanForEditableSchemas(themeRoot) {
  const schemas = {};
  const filesToScan = [];

  const dirsToScan = [
    path.join(themeRoot, "src", "app"),
    path.join(themeRoot, "src", "editables"),
    path.join(themeRoot, "src", "cms", "editables"),
    path.join(themeRoot, "cms", "editables"),
  ];

  function collectFilesRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          // sections/ hold block-level schemas; not page ACF groups
          if (item.name === "sections") continue;
          collectFilesRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          filesToScan.push(fullPath);
        }
      }
    } catch {}
  }

  for (const dir of dirsToScan) {
    collectFilesRecursive(dir);
  }

  // Prefer cms/editables over src on slug conflict
  filesToScan.sort((a, b) => priority(a) - priority(b));

  for (const filePath of filesToScan) {
    try {
      const content = readFileSync(filePath, "utf8");
      if (!content.includes("defineEditable") && !content.includes("buildPageEditable") && !content.includes("pageEditableSections")) {
        continue;
      }

      let parsed = null;

      // Composed page: pageEditableSections + section files
      if (content.includes("pageEditableSections")) {
        parsed = parseComposedPageEditable(filePath, content);
      }

      if (!parsed) {
        const schemaStr = extractDefineEditableContent(content);
        if (schemaStr) {
          parsed = parseEditableSchema(schemaStr, filePath);
        }
      }

      if (parsed && Object.keys(parsed).length > 0) {
        const baseName = path.basename(filePath, path.extname(filePath));
        let slug = baseName
          .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
          .toLowerCase();

        if (slug === "page") {
          slug = "front-page";
        }

        schemas[slug] = parsed;
      }
    } catch (err) {
      console.warn(`[Schema Scanner] Failed to scan file ${filePath}:`, err.message);
    }
  }

  return schemas;
}

function priority(filePath) {
  const n = filePath.replace(/\\/g, "/");
  if (n.includes("/cms/editables/")) return 3;
  if (n.includes("/src/cms/editables/")) return 2;
  if (n.includes("/src/editables/")) return 1;
  return 0;
}

/**
 * Parse:
 *   export const pageEditableSections = [
 *     { section: 'about-hero', prefix: 'hero_', rename: { image1: 'image_1' } },
 *     ...
 *   ];
 * and merge schemas from cms/editables/sections/<section>.ts
 */
function parseComposedPageEditable(pageFilePath, content) {
  const match = content.match(
    /export\s+const\s+pageEditableSections\s*=\s*(\[[\s\S]*?\]);/,
  );
  if (!match) return null;

  let sections;
  try {
    sections = new Function(`return (${match[1]});`)();
  } catch (e) {
    console.warn(`[Schema Scanner] Could not eval pageEditableSections in ${pageFilePath}:`, e.message);
    return null;
  }

  if (!Array.isArray(sections)) return null;

  const sectionsDir = path.join(path.dirname(pageFilePath), "sections");
  const merged = {};

  for (const entry of sections) {
    if (!entry || typeof entry.section !== "string") continue;
    const sectionPath = path.join(sectionsDir, `${entry.section}.ts`);
    const sectionPathTsx = path.join(sectionsDir, `${entry.section}.tsx`);
    const resolved = existsSync(sectionPath)
      ? sectionPath
      : existsSync(sectionPathTsx)
        ? sectionPathTsx
        : null;
    if (!resolved) {
      console.warn(`[Schema Scanner] Missing section file for "${entry.section}" (expected under ${sectionsDir})`);
      continue;
    }

    const sectionCode = readFileSync(resolved, "utf8");
    const schemaStr = extractDefineEditableContent(sectionCode);
    if (!schemaStr) continue;
    const schema = parseEditableSchema(schemaStr, resolved);
    if (!schema) continue;

    const prefix = entry.prefix || "";
    const rename = entry.rename || {};
    for (const [key, field] of Object.entries(schema)) {
      const suffix = rename[key] ?? key;
      merged[`${prefix}${suffix}`] = field;
    }
  }

  return merged;
}

/**
 * Collect `const NAME = <literal>;` at module scope (column 0) before `endIndex`.
 * Uses brace/bracket balancing so mid-function `const x = [a].filter(...)` is ignored.
 * @param {string} fileContent
 * @param {number} endIndex
 * @returns {string} JS prelude statements
 */
function extractModuleLevelConstPrelude(fileContent, endIndex) {
  const head = fileContent.slice(0, Math.max(0, endIndex));
  let prelude = "";
  // Line-start only (module scope). Indentation ⇒ inside a function/block.
  const re = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*/gm;
  let m;
  while ((m = re.exec(head)) !== null) {
    const name = m[1];
    let i = m.index + m[0].length;
    while (i < head.length && /\s/.test(head[i])) i++;
    if (i >= head.length) continue;
    const startChar = head[i];
    let value = null;

    if (startChar === "'" || startChar === '"' || startChar === "`") {
      const quote = startChar;
      let j = i + 1;
      let esc = false;
      for (; j < head.length; j++) {
        if (esc) {
          esc = false;
          continue;
        }
        if (head[j] === "\\") {
          esc = true;
          continue;
        }
        if (head[j] === quote) {
          j++;
          break;
        }
      }
      while (j < head.length && /\s/.test(head[j])) j++;
      if (head[j] === ";") {
        value = head.slice(i, j);
      }
    } else if (startChar === "[" || startChar === "{") {
      const open = startChar;
      const close = open === "[" ? "]" : "}";
      let depth = 0;
      let j = i;
      let inStr = null;
      let esc = false;
      for (; j < head.length; j++) {
        const c = head[j];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === inStr) inStr = null;
          continue;
        }
        if (c === "'" || c === '"' || c === "`") {
          inStr = c;
          continue;
        }
        if (c === open) depth++;
        else if (c === close) {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      while (j < head.length && /\s/.test(head[j])) j++;
      // Only pure literals ending with `;` — reject `.filter(...)` chains etc.
      if (head[j] === ";") {
        value = head.slice(i, j);
      }
    } else if (/^-?\d/.test(head.slice(i)) || head.startsWith("true", i) || head.startsWith("false", i) || head.startsWith("null", i)) {
      let j = i;
      while (j < head.length && head[j] !== ";" && head[j] !== "\n") j++;
      if (head[j] === ";") {
        const raw = head.slice(i, j).trim();
        if (/^(-?\d+(\.\d+)?|true|false|null)$/.test(raw)) {
          value = raw;
        }
      }
    }

    if (value != null) {
      prelude += `const ${name} = ${value};\n`;
    }
  }
  return prelude;
}

function extractDefineEditableContent(fileContent) {
  const match = fileContent.match(/export\s+const\s+editable\s*=\s*defineEditable\s*\(/);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  let parenCount = 1;
  let currentIndex = startIndex;

  while (parenCount > 0 && currentIndex < fileContent.length) {
    const char = fileContent[currentIndex];
    if (char === "(") {
      parenCount++;
    } else if (char === ")") {
      parenCount--;
    }
    currentIndex++;
  }

  if (parenCount === 0) {
    return fileContent.substring(startIndex, currentIndex - 1);
  }
  return null;
}

/**
 * Eval defineEditable object literal. Injects same-file const declarations
 * (ICON_ALLOWLIST, etc.) when present — mirrors block scanner behaviour.
 */
function parseEditableSchema(schemaStr, filePathForConsts) {
  const text = (opts) => ({ type: "text", ...opts });
  const richText = (opts) => ({ type: "richText", ...opts });
  const image = (opts) => ({ type: "image", ...opts });
  const boolean = (opts) => ({ type: "boolean", ...opts });
  const repeater = (opts) => ({ type: "repeater", ...opts });
  const color = (opts) => ({ type: "color", ...opts });
  const url = (opts) => ({ type: "url", ...opts });
  const select = (opts) => ({ type: "select", ...opts });
  const number = (opts) => ({ type: "number", ...opts });
  const icon = (opts) => ({ type: "icon", provider: "lucide", ...opts });

  let prelude = "";
  if (filePathForConsts && existsSync(filePathForConsts)) {
    try {
      const fileContent = readFileSync(filePathForConsts, "utf8");
      const editableIdx = fileContent.indexOf("defineEditable(");
      // Only module-level consts (start of line). A loose `const x = [a, b]`
      // match used to swallow mid-function bodies (e.g. `const customImages =
      // [galleryImage1, …].filter…`) and then `eval` failed with
      // "galleryImage1 is not defined" — dropping the whole hotel schema so
      // CPT fields never registered for REST / ACF.
      prelude = extractModuleLevelConstPrelude(
        fileContent,
        editableIdx === -1 ? fileContent.length : editableIdx,
      );
    } catch {}
  }

  try {
    const fn = new Function(
      "text",
      "richText",
      "image",
      "boolean",
      "repeater",
      "color",
      "url",
      "select",
      "number",
      "icon",
      `${prelude}return (${schemaStr});`,
    );
    return fn(text, richText, image, boolean, repeater, color, url, select, number, icon);
  } catch (e) {
    console.error("[Schema Parser] Failed to evaluate schema literal:", e.message);
    return null;
  }
}
