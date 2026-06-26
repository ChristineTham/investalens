import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Run a git command at build time, returning a fallback if git is unavailable. */
function git(args: string, fallback = ""): string {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

// Version = package version + a build number derived from the git commit count.
const commitCount = git("rev-list --count HEAD", "");
const appVersion =
  commitCount && commitCount !== "0" ? `${pkg.version}+${commitCount}` : pkg.version;

const buildTime = new Date().toISOString();

// Recent changelog from git history (hash · date · subject), unit-separated.
const changelog = git("log -n 10 --date=short --pretty=format:%h%x1f%ad%x1f%s", "")
  .split("\n")
  .map((line) => line.split("\x1f"))
  .filter((parts) => parts.length === 3)
  .map(([hash, date, subject]) => ({ hash, date, subject }));

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: appVersion,
    APP_BUILD_TIME: buildTime,
    APP_CHANGELOG: JSON.stringify(changelog),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
