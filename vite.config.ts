/** @type {import('vite').UserConfig} */
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  build: {
    minify: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      fileName: "index",
      name: "useSearchParamState",
    },
    rollupOptions: {
      plugins: [
        typescript({
          declaration: true,
          outDir: "dist",
          include: "src/index.ts",
        }),
        react(),
      ],
      external: ["react"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
