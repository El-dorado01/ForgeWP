import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function addToPnpmWorkspace(targetDir) {
  let currentDir = process.cwd();
  let workspaceFile = null;

  // Search upwards for pnpm-workspace.yaml
  while (currentDir !== path.parse(currentDir).root) {
    const checkPath = path.join(currentDir, "pnpm-workspace.yaml");
    if (existsSync(checkPath)) {
      workspaceFile = checkPath;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (!workspaceFile) return;

  const workspaceRoot = path.dirname(workspaceFile);
  const relativeTarget = path.relative(workspaceRoot, targetDir).replace(/\\/g, "/");

  try {
    let content = readFileSync(workspaceFile, "utf8");
    
    // Very basic YAML parsing/appending to avoid adding a heavy dependency like js-yaml
    if (content.includes(`- "${relativeTarget}"`) || content.includes(`- '${relativeTarget}'`) || content.includes(`- ${relativeTarget}`)) {
      return; // Already there
    }

    if (content.trim().startsWith("packages:")) {
      const lines = content.split("\n");
      let insertIndex = -1;
      
      // Find the first line after 'packages:' that starts with '-'
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("packages:")) {
          insertIndex = i + 1;
          break;
        }
      }

      if (insertIndex !== -1) {
        lines.splice(insertIndex, 0, `  - "${relativeTarget}"`);
        writeFileSync(workspaceFile, lines.join("\n"), "utf8");
      }
    }
    return workspaceRoot;
  } catch (err) {
    return null;
  }
}
