#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const requiredRuntimeFiles = [
  "background.js",
  "content.js",
  "popup.js",
  "settings.js",
  "manifest.json",
  "manifest-v2.json"
];

for (const relativePath of requiredRuntimeFiles) {
  assert.ok(fs.existsSync(path.join(rootDir, relativePath)), `${relativePath} is missing`);
}

console.log("Integration sanity test passed.");
