import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import archiver from "archiver";

/**
 * @param {string} themeDir
 * @param {string} zipPath
 * @returns {Promise<string>}
 */
export function zipTheme(themeDir, zipPath) {
  mkdirSync(path.dirname(zipPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);
    output.on("error", reject);

    archive.pipe(output);
    archive.directory(themeDir, path.basename(themeDir));
    archive.finalize();
  });
}

/**
 * @param {string} zipPath
 */
export function assertZipCreated(zipPath) {
  if (!existsSync(zipPath)) {
    throw new Error(`ZIP was not created: ${zipPath}`);
  }
}
