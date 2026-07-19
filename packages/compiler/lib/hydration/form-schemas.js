import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Scans `cms/forms/**` for `defineWpForm(...)` schemas — the same
 * text-extraction + `new Function` eval technique scanForEditableSchemas
 * uses for `cms/editables/**`, simplified since a form config is a plain
 * nested object literal (no field-builder helper functions to inject).
 *
 * The filename becomes the form's key, matching `cms/editables/{slug}.ts`'s
 * filename → slug convention (e.g. `contact.ts` → `contact`).
 *
 * @param {string} themeRoot
 * @returns {Record<string, import('../index.d.ts').ForgeWPFormConfig>} form key → parsed config
 */
export function scanForFormSchemas(themeRoot) {
  const forms = {};
  const formsDir = path.join(themeRoot, "cms", "forms");
  if (!existsSync(formsDir)) return forms;

  const filesToScan = [];
  function collectFilesRecursive(dir) {
    if (!existsSync(dir)) return;
    try {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          collectFilesRecursive(fullPath);
        } else if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".tsx"))) {
          filesToScan.push(fullPath);
        }
      }
    } catch {}
  }
  collectFilesRecursive(formsDir);

  for (const filePath of filesToScan) {
    try {
      const content = readFileSync(filePath, "utf8");
      if (!content.includes("defineWpForm")) continue;

      const schemaStr = extractDefineWpFormContent(content);
      if (!schemaStr) continue;

      const parsed = parseFormSchema(schemaStr, content);
      if (!parsed) continue;

      const baseName = path.basename(filePath, path.extname(filePath));
      const slug = baseName
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();

      forms[slug] = parsed;
    } catch (err) {
      console.warn(`[Form Schema Scanner] Failed to scan file ${filePath}:`, err.message);
    }
  }

  return forms;
}

function extractDefineWpFormContent(fileContent) {
  const match = fileContent.match(/export\s+const\s+form\s*=\s*defineWpForm\s*\(/);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  let parenCount = 1;
  let currentIndex = startIndex;
  let inStr = null;
  let esc = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (parenCount > 0 && currentIndex < fileContent.length) {
    const char = fileContent[currentIndex];
    const next = fileContent[currentIndex + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
    } else if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        currentIndex++;
      }
    } else if (inStr) {
      if (esc) esc = false;
      else if (char === "\\") esc = true;
      else if (char === inStr) inStr = null;
    } else if (char === "/" && next === "/") {
      inLineComment = true;
      currentIndex++;
    } else if (char === "/" && next === "*") {
      inBlockComment = true;
      currentIndex++;
    } else if (char === "'" || char === '"' || char === "`") {
      inStr = char;
    } else if (char === "(") {
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
 * Eval a defineWpForm object literal. Same module-level const prelude
 * support as editable schemas (e.g. a shared `const SUBJECT_OPTIONS = [...]`
 * referenced from inside the config), for parity — not required for the
 * common case, which is a fully self-contained object literal.
 */
function parseFormSchema(schemaStr, fileContent) {
  let prelude = "";
  try {
    const formIdx = fileContent.indexOf("defineWpForm(");
    prelude = extractModuleLevelConstPrelude(
      fileContent,
      formIdx === -1 ? fileContent.length : formIdx,
    );
  } catch {}

  try {
    const fn = new Function(`${prelude}return (${schemaStr});`);
    return fn();
  } catch (e) {
    console.error("[Form Schema Scanner] Failed to evaluate form config literal:", e.message);
    return null;
  }
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
