import type { WebPlatform } from "@internals/core";
import { UAParser } from "ua-parser-js";

/**
 * Calculates platform information for browser environment.
 *
 * @returns Web platform information or null in SSR
 */
export const calculatePlatformInfo = (): WebPlatform | null => {
  if (typeof navigator === "undefined") return null;

  const parser = new UAParser(navigator.userAgent);

  const browser = parser.getBrowser();
  const device = parser.getDevice();
  const os = parser.getOS();

  return {
    type: "web",
    browser: {
      name: browser.name?.toLowerCase() || "UNKNOWN",
      version: browser.version?.toLowerCase() || "UNKNOWN",
    },
    device: {
      name: device.type?.toLowerCase() || "desktop",
      version: device.vendor?.toLowerCase() || "UNKNOWN",
    },
    os: {
      name: os.name?.toLowerCase() || "UNKNOWN",
      version: os.version?.toLowerCase() || "UNKNOWN",
    },
  } satisfies WebPlatform;
};
