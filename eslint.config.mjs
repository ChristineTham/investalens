import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party agent skill files — not project code
    ".agents/**",
    // Generated code
    "generated/**",
    // Node.js scripts — not Next.js app code, and they pull in heavy Prisma types
    "scripts/**",
    "prisma/seed.ts",
  ]),
]);

export default eslintConfig;
