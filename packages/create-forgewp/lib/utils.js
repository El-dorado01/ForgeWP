export function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function titleCaseFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isValidProjectDirName(name) {
  return /^[a-zA-Z0-9._-]+$/.test(name) && name !== "." && name !== "..";
}

import { existsSync } from 'node:fs';
import path from 'node:path';

export function detectPackageManager() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  if (existsSync(path.join(process.cwd(), "pnpm-workspace.yaml"))) return "pnpm";
  return "npm";
}
