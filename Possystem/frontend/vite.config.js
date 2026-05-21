import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 5173, // Updated dev server port
    proxy: {
      // Proxy /api requests to backend server
      // When frontend makes request to /api/*, Vite forwards to http://localhost:5000/api/*
      // This solves CORS issues and allows relative URLs in fetch
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        // Optionally log proxy requests for debugging
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔀 Proxying:', req.method, req.url, '→', options.target + req.url);
          });
        }
      },
    },
  },
});
