import { defineConfig } from "vitest/config";
import path from "node:path";

const dirname = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    // Integration tests hit a hosted Postgres (~300ms per round trip from a laptop);
    // a single test can need 20+ round trips.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "server-only": path.resolve(dirname, "tests/mocks/server-only.ts"),
      "@": path.resolve(dirname, "src"),
    },
  },
});
