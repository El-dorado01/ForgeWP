import { spawnSync } from "node:child_process";

const INSTALL_COMMANDS = {
  npm: ["install"],
  pnpm: ["install"],
  yarn: ["install"],
  bun: ["install"],
};

export function installDependencies(targetDir, packageManager) {
  const args = INSTALL_COMMANDS[packageManager] ?? INSTALL_COMMANDS.npm;

  const result = spawnSync(packageManager, args, {
    cwd: targetDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${packageManager} install failed`);
  }
}
