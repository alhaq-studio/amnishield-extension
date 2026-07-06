#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const rulesPath = path.join(rootDir, "rules.json");
const blocklistPath = path.join(rootDir, "data", "blocklists", "adult-domains.json");

const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
assert.ok(Array.isArray(rules), "rules.json must be an array");
assert.ok(rules.length > 0, "rules.json should contain at least one rule");

if (fs.existsSync(blocklistPath)) {
  const blocklist = JSON.parse(fs.readFileSync(blocklistPath, "utf8"));
  assert.ok(Array.isArray(blocklist), "adult-domains.json must be an array when present");
}

console.log("Blocklist loading validation passed.");
