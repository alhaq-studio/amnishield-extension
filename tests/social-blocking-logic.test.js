#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const backgroundPath = path.join(rootDir, "background.js");
const source = fs.readFileSync(backgroundPath, "utf8");

assert.ok(source.includes("social"), "background.js should include social blocking logic");
assert.ok(source.includes("declarativeNetRequest") || source.includes("updateDynamicRules"), "background.js should manage network rules");

console.log("Social blocking logic test passed.");
