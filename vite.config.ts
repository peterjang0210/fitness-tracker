import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Relative paths so the production build can be hosted from a GitHub Pages project site.
  base: "./",
});
