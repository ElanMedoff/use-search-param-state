import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/use-url.ts"],
  clean: true,
  minify: true,
  dts: true,
  format: ["cjs", "esm"],
});
