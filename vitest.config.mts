import { defineConfig } from "vitest/config";
import path from "node:path";

const dirname = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(dirname, "tests/mocks/server-only.ts"),
      "@": path.resolve(dirname, "."),
    },
  },
});
