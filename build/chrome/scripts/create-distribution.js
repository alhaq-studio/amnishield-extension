#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const distDir = path.join(rootDir, "dist");
const pkg = require(path.join(rootDir, "package.json"));

function zipDirectory(sourceDir, outPath) {
  const command = `Compress-Archive -Path "${sourceDir}\\*" -DestinationPath "${outPath}" -Force`;
  const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`Failed to create archive: ${outPath}`);
  }
}

function main() {
  fs.mkdirSync(distDir, { recursive: true });
  const version = pkg.version || "0.0.0";
  const chromeSrc = path.join(buildDir, "chrome");
  const firefoxSrc = path.join(buildDir, "firefox");

  if (!fs.existsSync(chromeSrc) || !fs.existsSync(firefoxSrc)) {
    throw new Error("Build outputs are missing. Run `npm run build` first.");
  }

  zipDirectory(chromeSrc, path.join(distDir, `amn-shield-v${version}-Chrome.zip`));
  zipDirectory(firefoxSrc, path.join(distDir, `amn-shield-v${version}-Firefox.zip`));
  console.log("Distribution packages created.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
