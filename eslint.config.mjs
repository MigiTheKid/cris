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
    // CRIS: protótipos de design (referência, não código de produção),
    // docs, infra do supabase e types gerados.
    "_design/**",
    "design_handoff_cris/**",
    "_docs/**",
    "supabase/**",
    "src/lib/database.types.ts",
  ]),
]);

export default eslintConfig;
