import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/clippings": process.env["API_PROXY_TARGET"] ?? "http://localhost:3000",
    },
  },
});
