import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests target the pure logic layer (calculations, tax reports, import
// mapping, CSV escaping, rate limiting). The "@/..." alias mirrors tsconfig so
// modules resolve the same way they do under Next.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/unit/**/*.test.ts"],
    globals: true,
  },
});
