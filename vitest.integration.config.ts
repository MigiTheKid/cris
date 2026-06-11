import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

/** Lê o `.env.local` num record simples (sem depender do vite/loadEnv). */
function loadEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf8");
    const env: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

/**
 * Config dedicado aos testes de INTEGRAÇÃO (RLS contra o Supabase local).
 * Ambiente Node + carrega `.env.local` (URL, anon, service role). Exige Docker up.
 * Rodar com: pnpm test:rls
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["integration/**/*.test.ts"],
    env: loadEnvLocal(),
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
