#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Fails if any product-identity literal from product/generated/banned-literals.json
// appears in nova/ or nova-server/ source (TRD Sec 34 — no hardcoded branding).
// product/generated/ itself and design-token dist are excluded.
//
// Usage: node scripts/check-no-hardcoded-branding.mjs

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BANNED_FILE = join(ROOT, "product/generated/banned-literals.json");

if (!existsSync(BANNED_FILE)) {
  console.error("✗ run `node scripts/gen-branding.mjs` first (missing banned-literals.json)");
  process.exit(1);
}
const { literals } = JSON.parse(readFileSync(BANNED_FILE, "utf8"));

const SCAN_DIRS = ["nova", "nova-server"].map((d) => join(ROOT, d)).filter(existsSync);
const SKIP_DIRS = new Set(["node_modules", "dist", "generated", "target", ".git"]);
const CODE_EXT = new Set([".hxx", ".hpp", ".h", ".cxx", ".cpp", ".c", ".mjs", ".js", ".ts", ".rs", ".py", ".xcu", ".xcs", ".ui"]);

const hits = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(p);
    } else if (CODE_EXT.has(extname(entry))) {
      const text = readFileSync(p, "utf8");
      text.split(/\r?\n/).forEach((line, i) => {
        for (const lit of literals) {
          if (line.includes(lit)) hits.push({ file: p.slice(ROOT.length + 1), line: i + 1, lit });
        }
      });
    }
  }
}
SCAN_DIRS.forEach(walk);

if (hits.length) {
  console.error("✗ hardcoded product-identity literal(s) found — use nova::brand::* / nova-branding.json instead:");
  for (const h of hits) console.error(`  ${h.file}:${h.line}  "${h.lit}"`);
  process.exit(1);
}
console.log(`✓ no hardcoded branding in ${SCAN_DIRS.length ? SCAN_DIRS.map((d) => d.slice(ROOT.length + 1)).join(", ") : "(no nova/ source yet)"} (${literals.length} literals checked)`);
