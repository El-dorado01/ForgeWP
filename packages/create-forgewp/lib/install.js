import { spawn } from "node:child_process";

/**
 * Install dependencies without flooding the terminal: output is captured and
 * returned so the caller can show it only when the install fails.
 * Async so a spinner can keep animating while the package manager runs.
 * @returns {Promise<{ ok: boolean, output: string }>}
 */
export function installDependencies(targetDir, packageManager) {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(packageManager, ["install"], {
      cwd: targetDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => resolve({ ok: false, output: `${output}\n${error.message}` }));
    child.on("close", (code) => resolve({ ok: code === 0, output }));
  });
}
