#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const modulePath = path.join(rootDir, "offscreen.js");

assert.ok(fs.existsSync(modulePath), "offscreen.js must exist");
const source = fs.readFileSync(modulePath, "utf8");
assert.ok(source.length > 100000, "offscreen.js seems unexpectedly small (compiled bundler check)");

console.log("AI analyzer baseline test passed.");
