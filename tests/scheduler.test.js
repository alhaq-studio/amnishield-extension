#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const rootDir = path.resolve(__dirname, "..");
const schedulerPath = path.join(rootDir, "services", "scheduler.js");

assert.ok(fs.existsSync(schedulerPath), "services/scheduler.js must exist");
const content = fs.readFileSync(schedulerPath, "utf8");
assert.ok(content.includes("function") || content.includes("=>"), "scheduler.js appears empty");

console.log("Scheduler test passed.");
