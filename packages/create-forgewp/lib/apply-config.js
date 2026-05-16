import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing ${path.basename(filePath)} in scaffold.\n` +
        "The CLI template may be out of date — run pnpm sync:template in the ForgeWP repo.",
    );
  }

  let content = readFileSync(filePath, "utf8");
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  writeFileSync(filePath, content, "utf8");
}

export function applyProjectConfig(targetDir, config) {
  const { packageName, themeName, slug, description, textDomain, version } =
    config;

  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readJson(pkgPath);
  pkg.name = packageName;
  pkg.private = true;
  pkg.version = version;

  // If we are inside the ForgeWP monorepo, use workspace:* for the compiler dependency
  // to ensure pnpm links it locally instead of trying to fetch from the registry.
  if (pkg.devDependencies?.["@forgewp/compiler"] && existsSync(path.join(targetDir, "..", "pnpm-workspace.yaml"))) {
    pkg.devDependencies["@forgewp/compiler"] = "workspace:*";
  }

  writeJson(pkgPath, pkg);

  const wpConfigPath = path.join(targetDir, "wp.config.ts");
  writeFileSync(
    wpConfigPath,
    `import type { ForgeWPThemeConfig } from "./src/lib/forgewp-config";

const config: ForgeWPThemeConfig = {
  name: ${JSON.stringify(themeName)},
  slug: ${JSON.stringify(slug)},
  version: ${JSON.stringify(version)},
  description: ${JSON.stringify(description)},
  textDomain: ${JSON.stringify(textDomain)},
};

export default config;
`,
    "utf8",
  );

  replaceInFile(path.join(targetDir, "index.html"), [
    ["ForgeWP Starter", themeName],
  ]);

  replaceInFile(path.join(targetDir, "src", "components", "SiteHeader.tsx"), [
    ["ForgeWP Starter", themeName],
  ]);

  replaceInFile(path.join(targetDir, "src", "components", "SiteFooter.tsx"), [
    [
      "ForgeWP — dev preview. WordPress export comes in Step 2.",
      `${themeName} — built with ForgeWP.`,
    ],
  ]);
}
