import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "node",
    include: ["**/?(*.)+(test).[jt]s?(x)"],
  },
});

export default config;
