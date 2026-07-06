import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/core/**/*.ts"],
      reporter: ["text", "html"],
    },
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
  },
});
