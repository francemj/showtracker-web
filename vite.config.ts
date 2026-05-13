import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "apps", "web", "src"),
      "@shared": path.resolve(import.meta.dirname, "packages", "shared"),
      "@showtracker/api-client": path.resolve(import.meta.dirname, "packages", "api-client", "src", "index.ts"),
    },
  },
  root: path.resolve(import.meta.dirname, "apps", "web"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
})
