#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "build", "firefox");

const includeDirs = [
  "assets",
  "css",
  "data",
  "DeenTab",
  "images",
  "netRequestRules",
  "scripts",
  "services",
  "src",
  "tfjs"
];

const includeFiles = [
  "background-v2.js",
  "background.html",
  "block.html",
  "constants.js",
  "content.js",
  "guide.html",
  "guide.js",
  "help.html",
  "help.js",
  "LICENSE",
  "manifest-v2.json",
  "polyfill.js",
  "popup.css",
  "popup-ecosystem.js",
  "popup.html",
  "popup.js",
  "privacy.html",
  "privacy.js",
  "settings.html",
  "settings.js",
  "timetable-editor.html",
  "uninstall.html",
  "uninstall.js",
  "welcome.html",
  "welcome.js"
];

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!fs.existsSync(source)) return;
  const target = path.join(outDir, relativePath);
  const normalizedTarget = relativePath === "manifest-v2.json" ? path.join(outDir, "manifest.json") : target;
  fs.mkdirSync(path.dirname(normalizedTarget), { recursive: true });
  fs.cpSync(source, normalizedTarget, { recursive: true, force: true });
}

resetDir(outDir);
includeDirs.forEach(copyIfExists);
includeFiles.forEach(copyIfExists);

console.log(`Firefox build created at ${outDir}`);
