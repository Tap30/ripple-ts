import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: ["**/?(*.)+(test).[jt]s?(x)"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "clover", "json-summary"],
      include: ["**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/index.ts",
        "**/types.ts",
      ],
      thresholds: {
        "100": true,
      },
    },
  },
});

export default config;
