import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monkey({
      entry: "src/main.tsx",
      userscript: {
        icon: "https://vitejs.dev/logo.svg",
        namespace: "npm/vite-plugin-monkey",
        match: [
          "*://leetcode.com/u/*",
          "*://www.leetcode.com/u/*", 
          "*://leetcode.com/contest/*",
          "*://www.leetcode.com/contest/*",
          '*://leetcode.com/problems/*',
          '*://www.leetcode.com/problems/*'

        ],
        "run-at":"document-start"
      },
    }),
  ],
  build: {
    //this will help convert images less than 500kb into base64 so that they are embedded directly in the script
    assetsInlineLimit: 500000, 
  },
});
