#!/usr/bin/env tsx

import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env, exit } from "node:process";

const GITHUB_TOKEN = env["GITHUB_TOKEN"];
const REPO_OWNER = "Tap30";
const REPO_NAME = "ripple-ts";

const PRE_RELEASE_TAGS = ["alpha", "beta", "rc"] as const;
const PACKAGE_DIRS = ["packages/browser", "packages/node"] as const;

const ROOT_DIR = resolve(import.meta.dirname, "..");

if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN environment variable is required");

  exit(1);
}

const exec = (command: string): string => {
  console.log(`> ${command}`);

  return execSync(command, { encoding: "utf8", stdio: "inherit" });
};

interface PackageJson {
  name: string;
  version: string;
}

const createGitHubRelease = async (
  tag: string,
  packageName: string,
  version: string,
): Promise<void> => {
  const releaseData = {
    tag_name: tag,
    name: `${packageName}@${version}`,
    body: `Pre-release version ${version} of ${packageName}`,
    prerelease: true,
  };

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(releaseData),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create GitHub release: ${response.statusText}`);
  }

  console.log(`✅ Created GitHub release: ${tag}`);
};

try {
  // Ensure we're on main branch and up to date
  exec("git checkout main");
  exec("git pull origin main");

  // Create pre-release changeset
  exec("pnpm changeset pre enter alpha");

  // Version packages
  exec("pnpm changeset version");

  // Build packages
  exec("pnpm run build");

  // Publish packages
  exec("pnpm changeset publish");

  const packageJsons = await Promise.all(
    PACKAGE_DIRS.map(async dir => {
      const packageJsonPath = join(ROOT_DIR, dir, "package.json");
      const content = await readFile(packageJsonPath, "utf-8");

      return JSON.parse(content) as PackageJson;
    }),
  );

  const publishedPackages = packageJsons
    .filter(pkg =>
      PRE_RELEASE_TAGS.includes(
        pkg.version as (typeof PRE_RELEASE_TAGS)[number],
      ),
    )
    .map(pkg => ({
      name: pkg.name,
      version: pkg.version,
      tag: `${pkg.name}@${pkg.version}`,
    }));

  if (publishedPackages.length === 0) {
    console.log("No pre-release packages to process");

    exit(0);
  }

  // Commit and push changes (including tags created by changeset publish)
  exec("git add .");
  exec('git commit -m "chore: pre-release versions"');
  exec("git push origin main --follow-tags");

  // Create GitHub releases in parallel
  await Promise.all(
    publishedPackages.map(pkg =>
      createGitHubRelease(pkg.tag, pkg.name, pkg.version),
    ),
  );

  // Exit pre-release mode
  exec("pnpm changeset pre exit");

  console.log("\n🎉 Pre-release completed successfully!");
  console.log("Published packages:");

  publishedPackages.forEach(pkg => {
    console.log(`  - ${pkg.name}@${pkg.version}`);
  });
} catch (error) {
  console.error("❌ Pre-release failed:", error);

  exit(1);
}
