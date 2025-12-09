import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/?(*.)+test.[jt]s?(x)"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text"],
      include: ["src/**/*.ts?(x)"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/**/index.ts",
        "src/**/types.ts",
        "src/**/coverage/**",
      ],
      thresholds: {
        "100": true,
      },
    },
  },
});

export default config;
