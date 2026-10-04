/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from /<repo>/, so production builds (and `vite preview`) use that base path.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? (process.env.BASE_PATH ?? "/ai-chat-ui/") : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    css: false,
  },
}));
