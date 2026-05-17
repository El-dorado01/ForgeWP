import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";
import { validateCriticalFiles } from "@forgewp/compiler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Custom Vite Plugin to validate and self-heal theme files on dev startup. */
function forgewpValidationPlugin(): PluginOption {
  return {
    name: "forgewp-validation",
    configureServer() {
      try {
        validateCriticalFiles(__dirname);
      } catch (err) {
        console.error(
          `\n\x1b[31m[ForgeWP Validation Error]\x1b[0m\n${
            err instanceof Error ? err.message : String(err)
          }\n`
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), forgewpValidationPlugin()] as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
  },
});
