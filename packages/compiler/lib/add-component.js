import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

export async function addComponent(component, options) {
  const { style = "forgewp" } = options;
  const projectRoot = process.cwd();

  console.log(pc.cyan(`\n  ForgeWP add — ${component} (${style})\n`));

  // 1. Check local registry first
  let registryPath;
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    registryPath = path.join(path.dirname(require.resolve("@forgewp/ui/package.json")), "components");
  } catch (e) {
    // Fallback for development/local execution
    registryPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../ui/components");
  }
  
  let localComponentFile = path.join(registryPath, component, `${style}.tsx`);
  if (!existsSync(localComponentFile)) {
    localComponentFile = path.join(registryPath, component, "forgewp.tsx");
  }

  if (existsSync(localComponentFile)) {
    console.log(pc.dim(`  Found ${component} in ForgeWP local registry...`));
    const targetDir = path.join(projectRoot, "src", "components", "ui");
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
    
    const targetFile = path.join(targetDir, `${component}.tsx`);
    const content = readFileSync(localComponentFile, "utf8");
    writeFileSync(targetFile, content, "utf8");
    
    // Auto-detect and install missing third-party dependencies from imported component files
    autoInstallMissingDependencies(targetFile, projectRoot);

    if (style === "forgewp") {
      sharpenFile(targetFile);
    }

    console.log(pc.green(`\n  Success! ${component} added to src/components/ui/\n`));
    return;
  }

  // 2. Run shadcn add (fallback)
  console.log(pc.dim(`  Fetching ${component} from shadcn/ui...`));
  try {
    // Auto-detect the package manager being used by the developer
    const userAgent = process.env.npm_config_user_agent || "";
    let shadcnCmd = "npx shadcn@latest"; // Default fallback

    if (userAgent.includes("pnpm")) {
      shadcnCmd = "pnpm dlx shadcn@latest";
    } else if (userAgent.includes("bun")) {
      shadcnCmd = "bunx --bun shadcn@latest";
    } else if (userAgent.includes("yarn")) {
      shadcnCmd = "yarn dlx shadcn@latest";
    }

    // We use --yes to skip prompts
    execSync(`${shadcnCmd} add ${component} --yes`, {
      stdio: "inherit",
      cwd: projectRoot,
      shell: process.platform === "win32",
    });
  } catch (err) {
    throw new Error(`Failed to add component via shadcn: ${err.message}`);
  }

  // 2. If style is forgewp, sharpen the components
  if (style === "forgewp") {
    console.log(pc.dim("  Applying ForgeWP Sharp aesthetics..."));
    const uiDir = path.join(projectRoot, "src", "components", "ui");
    
    if (!existsSync(uiDir)) return;

    const files = readdirSync(uiDir);
    // Find files related to the component
    const relevantFiles = files.filter(f => 
      f.toLowerCase().includes(component.toLowerCase().replace(/-/g, "")) ||
      f.toLowerCase().includes(component.toLowerCase())
    );

    if (relevantFiles.length > 0) {
      relevantFiles.forEach(f => {
        if (f.endsWith(".tsx")) sharpenFile(path.join(uiDir, f));
      });
    } else {
      // Fallback: sharpen everything in the UI dir to be safe
      files.forEach(f => {
        if (f.endsWith(".tsx")) sharpenFile(path.join(uiDir, f));
      });
    }
  }

  console.log(pc.green(`\n  Success! ${component} added to src/components/ui/\n`));
}

function sharpenFile(filePath) {
  let content = readFileSync(filePath, "utf8");
  
  // Regex to find and replace rounding classes, including variants (e.g., focus:rounded-md)
  const sharpened = content.replace(/(?:\b|['"\s])([a-z0-9-:]+)?rounded(-[a-z0-9\[\]]+)?(?=["'\s])/g, (match, prefix, suffix) => {
    // If it's just 'rounded' or 'rounded-*', replace it
    if (match.includes("rounded")) {
      // Preserve prefixes like 'focus:'
      const cleanPrefix = match.split("rounded")[0];
      return `${cleanPrefix}rounded-none`;
    }
    return match;
  });
  
  if (content !== sharpened) {
    writeFileSync(filePath, sharpened, "utf8");
    console.log(pc.dim(`    Sharpened ${path.basename(filePath)}`));
  }
}

function autoInstallMissingDependencies(filePath, projectRoot) {
  const content = readFileSync(filePath, "utf8");
  
  // Find all import statements
  const importRegex = /import\s+(?:[a-zA-Z0-9_*$,{}\s]+from\s+)?['"]([^'"]+)['"]/g;
  const foundImports = new Set();
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Filter out local imports, React, and standard framework packages
    if (
      !importPath.startsWith(".") &&
      !importPath.startsWith("/") &&
      importPath !== "react" &&
      importPath !== "react-dom" &&
      importPath !== "@forgewp/react"
    ) {
      // Extract the base package name (e.g. framer-motion or @radix-ui/react-slot)
      let basePkg = importPath;
      if (importPath.startsWith("@")) {
        const parts = importPath.split("/");
        basePkg = `${parts[0]}/${parts[1]}`;
      } else {
        basePkg = importPath.split("/")[0];
      }
      foundImports.add(basePkg);
    }
  }

  if (foundImports.size === 0) return;

  const pkgJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  const currentDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {})
  };

  const missingDeps = Array.from(foundImports).filter(dep => !currentDeps[dep]);

  if (missingDeps.length > 0) {
    console.log(pc.yellow(`\n  ⚡ Detected missing dependencies: ${missingDeps.join(", ")}`));
    console.log(pc.dim("  Automatically installing dependencies..."));

    // Detect Package Manager
    let installCmd = "npm install --save";
    if (existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) {
      installCmd = "pnpm add";
    } else if (existsSync(path.join(projectRoot, "yarn.lock"))) {
      installCmd = "yarn add";
    } else if (existsSync(path.join(projectRoot, "bun.lockb"))) {
      installCmd = "bun add";
    }

    try {
      execSync(`${installCmd} ${missingDeps.join(" ")}`, {
        stdio: "inherit",
        cwd: projectRoot,
        shell: process.platform === "win32"
      });
      console.log(pc.green(`  ✅ Successfully installed: ${missingDeps.join(", ")}\n`));
    } catch (err) {
      console.log(pc.red(`  ❌ Auto-installation failed: ${err.message}`));
      console.log(pc.yellow(`  Please manually install: ${missingDeps.join(", ")}`));
    }
  }
}

