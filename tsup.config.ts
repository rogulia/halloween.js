import { defineConfig } from "tsup";

export default defineConfig({
  entry: { halloween: "src/index.ts" },
  format: ["esm", "cjs", "iife"],
  globalName: "Halloween",
  dts: true,
  clean: true,
  minify: true,
  outDir: "dist",
  outExtension({ format }) {
    if (format === "cjs") return { js: ".cjs" };
    if (format === "iife") return { js: ".iife.js" };
    return { js: ".js" };
  },
});
