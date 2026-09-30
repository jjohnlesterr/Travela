import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Installed tooling (PixelCrew / Impeccable), not app code:
    ".pixel-agents/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
