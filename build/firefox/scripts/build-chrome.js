#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "build", "chrome");

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
  "background.js",
  "block.html",
  "constants.js",
  "content.js",
  "guide.html",
  "guide.js",
  "help.html",
  "help.js",
  "LICENSE",
  "manifest.json",
  "polyfill.js",
  "popup.css",
  "popup-ecosystem.js",
  "popup.html",
  "popup.js",
  "privacy.html",
  "privacy.js",
  "rules.json",
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
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

resetDir(outDir);
includeDirs.forEach(copyIfExists);
includeFiles.forEach(copyIfExists);

console.log(`Chrome build created at ${outDir}`);
