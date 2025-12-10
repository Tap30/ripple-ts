import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts"],
  },
});

export default config;
