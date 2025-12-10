import tsconfigPaths from "vite-tsconfig-paths";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

const config = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text"],
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
