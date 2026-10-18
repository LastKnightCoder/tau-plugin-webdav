import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export default defineConfig({
  resolve: { alias: { webdav: require.resolve("webdav/web") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
