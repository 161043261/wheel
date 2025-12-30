import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    // include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ["node_modules/**", "dist/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["html"],
      exclude: ["node_modules/**", "dist/**"],
    },
  },
});
