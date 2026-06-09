import { defineConfig } from "vite";

// Tauri expects a fixed dev port and does not want Vite to clear the screen so
// that Rust compiler output stays visible.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  // Produce assets Tauri's WebView2 (Chromium-based) can run directly.
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
  },
});
