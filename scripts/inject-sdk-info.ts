import { globby } from "globby";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const targets = (await globby("packages/**/src/__sdk_build_info__.ts")).map(
  p => ({
    module: resolve(p, "."),
    packageJson: resolve(p, "../../package.json"),
  }),
);

const tasks = targets.map(async target => {
  const { module, packageJson } = target;

  const pkgJson = JSON.parse(await readFile(packageJson, "utf-8")) as Record<
    "name" | "version",
    string
  >;

  const { name, version } = pkgJson;

  const content = `/*
 * NOTE: These variables are automatically injected and replaced at build-time.
 *
 * Do not hard-code values here;
 * any changes will be overwritten during the build process.
 */
export const SDK_NAME = "${name}";
export const SDK_VERSION = "${version}";
`;

  await writeFile(module, content, "utf-8");

  console.log(`Updated ${module} with ${name}@${version}`);
});

await Promise.all(tasks);
