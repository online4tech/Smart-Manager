import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages project URL: https://online4tech.github.io/Smart-Manager/
  base: "/Smart-Manager/",
  plugins: [react()],
  server: { host: "0.0.0.0" }
});
