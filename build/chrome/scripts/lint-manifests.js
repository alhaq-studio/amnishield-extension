#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");

function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

const mv3 = readJson("manifest.json");
const mv2 = readJson("manifest-v2.json");

assert.strictEqual(mv3.manifest_version, 3, "manifest.json must be MV3");
assert.strictEqual(mv2.manifest_version, 2, "manifest-v2.json must be MV2");
assert.ok(Array.isArray(mv3.permissions), "MV3 permissions should be an array");
assert.ok(Array.isArray(mv3.host_permissions), "MV3 host_permissions should be an array");
assert.ok(mv3.background?.service_worker, "MV3 service worker is required");
assert.ok(Array.isArray(mv3.content_scripts) && mv3.content_scripts.length > 0, "MV3 content_scripts must be present");
assert.ok(Array.isArray(mv2.permissions), "MV2 permissions should be an array");
assert.ok(Array.isArray(mv2.background?.scripts) || typeof mv2.background?.page === "string", "MV2 background scripts or page should be present");

[
  "background.js",
  "background-v2.js",
  "content.js",
  "popup.js",
  "settings.js"
].forEach((file) => assert.ok(exists(file), `${file} is missing`));

if (mv3.content_security_policy?.extension_pages) {
  assert.ok(!mv3.content_security_policy.extension_pages.includes("http://"), "MV3 CSP must not allow insecure HTTP origins");
}

if (typeof mv2.content_security_policy === "string") {
  assert.ok(!mv2.content_security_policy.includes("http://"), "MV2 CSP must not allow insecure HTTP origins");
}

console.log("Manifest and runtime lint checks passed.");
