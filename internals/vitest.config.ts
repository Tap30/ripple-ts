import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: ["**/?(*.)+test.[jt]s?(x)"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text"],
      include: ["**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/index.ts",
        "**/types.ts",
        "**/adapters/**",
        "**/coverage/**",
      ],
      thresholds: {
        "100": true,
      },
    },
  },
});

export default config;
