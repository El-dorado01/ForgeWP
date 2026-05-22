/**
 * Run a script in packages/starter using whichever package manager invoked the root command.
 * Works with npm, pnpm, yarn (classic & berry), and bun.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = process.argv[2];

if (!script) {
  console.error("Usage: node scripts/run-workspace.mjs <script> [--adapter=<name> | --html | --react]");
  process.exit(1);
}

// Parse adapter option from environment variables or command-line arguments
let adapter = process.env.FORGEWP_ADAPTER || process.env.ADAPTER || "react";
const extraArgs = [];

for (let i = 3; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--adapter=")) {
    adapter = arg.split("=")[1];
  } else if (arg === "--html") {
    adapter = "html";
  } else if (arg === "--react") {
    adapter = "react";
  } else {
    extraArgs.push(arg);
  }
}

const starterDir = adapter === "html"
  ? path.join(__dirname, "..", "packages", "html-starter")
  : path.join(__dirname, "..", "packages", "starter");

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent ?? "";

  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (ua.startsWith("npm/")) return "npm";

  // Fallback when invoked directly (e.g. node scripts/run-workspace.mjs dev)
  if (process.env.PNPM_HOME) return "pnpm";
  if (process.env.BUN_INSTALL) return "bun";

  return "npm";
}

function starterEnv() {
  // Nested `pnpm run` from the monorepo root can leave INIT_CWD at the repo root,
  // which breaks TypeScript's resolution of @types/node in packages/starter.
  return { ...process.env, INIT_CWD: starterDir };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: starterDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: starterEnv(),
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const pm = detectPackageManager();

switch (pm) {
  case "pnpm":
    run("pnpm", ["run", script, ...extraArgs]);
    break;
  case "yarn":
    run("yarn", ["run", script, ...extraArgs]);
    break;
  case "bun":
    run("bun", ["run", script, ...extraArgs]);
    break;
  default:
    if (extraArgs.length > 0) {
      run("npm", ["run", script, "--", ...extraArgs]);
    } else {
      run("npm", ["run", script]);
    }
}
