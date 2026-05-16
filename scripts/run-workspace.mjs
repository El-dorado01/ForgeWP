/**
 * Run a script in packages/starter using whichever package manager invoked the root command.
 * Works with npm, pnpm, yarn (classic & berry), and bun.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const starterDir = path.join(__dirname, "..", "packages", "starter");
const script = process.argv[2];

if (!script) {
  console.error("Usage: node scripts/run-workspace.mjs <script>");
  process.exit(1);
}

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
    run("pnpm", ["run", script]);
    break;
  case "yarn":
    run("yarn", ["run", script]);
    break;
  case "bun":
    run("bun", ["run", script]);
    break;
  default:
    run("npm", ["run", script]);
}
