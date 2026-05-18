import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const packagesDir = path.join(root, "packages");

// Set exact target versions to recover from npm version split-state
const targetVersions = {
  "compiler": "0.1.9",
  "create-forgewp": "0.1.9",
  "ui": "0.1.9",
  "react": "0.1.1",
  "starter": "0.1.2"
};

console.log("🚀 Setting precise aligned package versions...");

for (const [pkg, nextVersion] of Object.entries(targetVersions)) {
  const pkgJsonPath = path.join(packagesDir, pkg, "package.json");
  if (existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const currentVersion = pkgJson.version;
    
    pkgJson.version = nextVersion;
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n", "utf8");
    console.log(`   ✅ ${pkgJson.name}: ${currentVersion} ➔ ${nextVersion}`);

    // Special check: if it's the starter package, also bump wp.config.ts version to match!
    if (pkg === "starter") {
      const wpConfigPath = path.join(packagesDir, "starter", "wp.config.ts");
      if (existsSync(wpConfigPath)) {
        let content = readFileSync(wpConfigPath, "utf8");
        content = content.replace(/(version:\s*['"])([^'"]+)(['"])/, `$1${nextVersion}$3`);
        writeFileSync(wpConfigPath, content, "utf8");
        console.log(`   ✅ @forgewp/starter wp.config.ts: updated version metadata to ${nextVersion}`);
      }
    }
  }
}

console.log("\n✨ Aligned versions successfully!");
