import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/__tests__/**/*.[jt]s?(x)",
      "src/**/?(*.)+(spec|test).[jt]s?(x)",
    ],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "clover", "json-summary"],
      include: ["src/**"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/index.ts",
        "src/**/types.ts",
      ],
      thresholds: {
        "100": true,
      },
    },
  },
});

export default config;
