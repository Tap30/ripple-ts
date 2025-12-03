import { defineConfig } from "tsup";

const config = defineConfig({
  entry: ["./src/index.ts"],
  tsconfig: "./tsconfig.json",
  splitting: false,
  sourcemap: false,
  clean: true,
  format: ["cjs", "esm"],
  outDir: "dist",
  dts: true,
  minify: true,
});

export default config;
