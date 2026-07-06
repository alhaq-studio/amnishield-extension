#!/usr/bin/env node
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const testFiles = [
  "manifest-validation.test.js",
  "blocklist-loading.test.js",
  "social-blocking-logic.test.js",
  "scheduler.test.js",
  "ai-analyzer.test.js",
  "integration.test.js"
];

for (const testFile of testFiles) {
  const testPath = path.join(__dirname, testFile);
  const result = spawnSync(process.execPath, [testPath], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("All tests passed.");
