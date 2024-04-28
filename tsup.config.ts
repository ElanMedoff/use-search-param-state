import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  clean: true,
  minify: true,
  dts: true,
  format: ["cjs", "esm"],
});
