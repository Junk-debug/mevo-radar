import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `npm run dev` runs the React app and the Worker (/api/*) together via the Cloudflare plugin.
export default defineConfig({
  plugins: [react(), cloudflare()],
  worker: { format: "es" },
  // Keep MapLibre un-prebundled so the main thread and its worker share the same module code.
  optimizeDeps: { exclude: ["maplibre-gl"] },
});
