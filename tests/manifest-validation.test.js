#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const mv3Path = path.join(rootDir, "manifest.json");
const mv2Path = path.join(rootDir, "manifest-v2.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const mv3 = readJson(mv3Path);
const mv2 = readJson(mv2Path);

assert.strictEqual(mv3.manifest_version, 3, "manifest.json must be MV3");
assert.strictEqual(mv2.manifest_version, 2, "manifest-v2.json must be MV2");
assert.ok(Array.isArray(mv3.permissions), "MV3 permissions missing");
assert.ok(Array.isArray(mv3.host_permissions), "MV3 host permissions missing");
assert.ok(mv3.background && mv3.background.service_worker, "MV3 service worker missing");
assert.ok(mv2.background && (Array.isArray(mv2.background.scripts) || typeof mv2.background.page === "string"), "MV2 background scripts or page missing");

console.log("Manifest validation passed.");
