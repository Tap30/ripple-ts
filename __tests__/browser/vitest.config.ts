import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "jsdom",
    include: ["**/?(*.)+test.[jt]s?(x)"],
  },
});

export default config;
