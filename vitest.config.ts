import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/*.test.js",
      "packages/**/*.test.jsx",
      "packages/**/*.spec.js",
      "packages/**/*.spec.jsx",
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      "packages/**/*.spec.ts",
      "packages/**/*.spec.tsx",
    ],
    exclude: ["dist", "coverage", "node_modules"],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      exclude: ["dist/", "coverage/", "node_modules/"],
    },
  },
  resolve: {
    alias: {
      // path aliases
    },
  },
});
