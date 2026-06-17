import type { SdkInfo, ServerPlatform } from "@internals/core";
import { SDK_NAME, SDK_VERSION } from "./__sdk_build_info__.ts";

export const SDK_INFO: SdkInfo = {
  name: SDK_NAME,
  version: SDK_VERSION,
};

export const PLATFORM_INFO: ServerPlatform = {
  type: "server",
};
