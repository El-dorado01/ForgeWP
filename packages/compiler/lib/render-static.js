import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Server-render the theme App to static HTML (no client JS in WordPress for v1).
 * @param {string} themeRoot
 * @returns {Promise<string>}
 */
export async function renderStaticMarkup(themeRoot) {
  const renderScript = path.join(__dirname, "render-theme.mts");
  const tsconfig = path.join(themeRoot, "tsconfig.json");

  let tsxCli = "tsx";
  try {
    tsxCli = require.resolve("tsx/cli");
  } catch {
    // fallback to PATH
  }

  const args = [tsxCli];
  if (existsSync(tsconfig)) {
    args.push("--tsconfig", tsconfig);
  }
  args.push(renderScript, themeRoot);

  const result = spawnSync(process.execPath, args, {
    cwd: themeRoot,
    env: {
      ...process.env,
      INIT_CWD: themeRoot,
    },
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || "Unknown error";
    throw new Error(`Static render failed:\n${detail}`);
  }

  const outDir = result.stdout?.trim() || path.join(themeRoot, ".forgewp");
  const appHtmlPath = path.join(outDir, "app.html");

  if (!existsSync(appHtmlPath)) {
    throw new Error(`Render output not found: ${appHtmlPath}`);
  }

  const headerHtmlPath = path.join(outDir, "header.html");
  const footerHtmlPath = path.join(outDir, "footer.html");
  const headHtmlPath = path.join(outDir, "head.html");
  const singleHtmlPath = path.join(outDir, "single.html");
  const notFoundHtmlPath = path.join(outDir, "404.html");

  return {
    appHtml: readFileSync(appHtmlPath, "utf8"),
    headerHtml: existsSync(headerHtmlPath)
      ? readFileSync(headerHtmlPath, "utf8")
      : "",
    footerHtml: existsSync(footerHtmlPath)
      ? readFileSync(footerHtmlPath, "utf8")
      : "",
    headHtml: existsSync(headHtmlPath)
      ? readFileSync(headHtmlPath, "utf8")
      : "",
    singleHtml: existsSync(singleHtmlPath)
      ? readFileSync(singleHtmlPath, "utf8")
      : "",
    notFoundHtml: existsSync(notFoundHtmlPath)
      ? readFileSync(notFoundHtmlPath, "utf8")
      : "",
  };
}
