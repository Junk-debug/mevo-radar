import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// `npm run dev` runs the web app and the Worker (/api/*) together via the Cloudflare plugin.
export default defineConfig({
  // The web app (index.html, public/) lives in web/; the build output stays at the project root.
  root: "web",
  build: { outDir: "../dist", emptyOutDir: true },
  plugins: [react(), cloudflare({ configPath: "../wrangler.jsonc" })],
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./web/", import.meta.url)),
      "@shared/": fileURLToPath(new URL("./shared/", import.meta.url)),
    },
  },
  worker: { format: "es" },
  // Keep MapLibre un-prebundled so the main thread and its worker share the same module code.
  optimizeDeps: { exclude: ["maplibre-gl"] },
});
