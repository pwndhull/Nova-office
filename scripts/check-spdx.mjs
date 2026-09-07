#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Every Nova-authored source/doc file must carry an SPDX identifier (TRD Sec 2,
// licensing.md Sec 2). Scans tracked files under nova/, scripts/, product/,
// docs/, tests/, nova-server/ and .github/. third_party/ and generated dirs are
// exempt (upstream keeps its own headers).

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const ROOT = process.cwd();
const INCLUDE = /^(nova|scripts|product|docs|tests|nova-server|\.github)\//;
const EXEMPT = /(^third_party\/|\/generated\/|\/dist\/|\/node_modules\/|\.gitkeep$|branding\/icons\/)/;
const NEEDS = new Set([
  ".mjs", ".js", ".ts", ".cxx", ".cpp", ".c", ".hxx", ".hpp", ".h", ".rs",
  ".py", ".sh", ".md", ".json", ".yml", ".yaml", ".xcu", ".xcs", ".svg",
]);

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && INCLUDE.test(f) && !EXEMPT.test(f) && NEEDS.has(extname(f)));

const missing = [];
for (const f of files) {
  let head;
  try { head = readFileSync(f, "utf8").slice(0, 1200); } catch { continue; }
  if (!head.includes("SPDX-License-Identifier:")) missing.push(f);
}

if (missing.length) {
  console.error(`✗ ${missing.length} file(s) missing an SPDX-License-Identifier header:`);
  for (const f of missing) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ SPDX header present on all ${files.length} checked files`);
