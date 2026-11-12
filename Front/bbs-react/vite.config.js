import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const proxy = { "/api": { target: "http://localhost:8080", changeOrigin: true, rewrite: path => path.replace(/^\/api/,"") } };
export default defineConfig({
  plugins:[react()],
  server:{port:5173,strictPort:true,proxy},
  preview:{port:4173,strictPort:true,proxy}
});
