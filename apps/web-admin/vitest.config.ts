import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 30_000,
    setupFiles: ["./src/core/test/setup.ts"],
    pool: "forks",
    maxWorkers: 1,
  },
});
