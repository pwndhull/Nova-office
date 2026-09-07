#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// Nova design-token build. Reads nova/design-tokens/src/*.json and emits, per
// theme, resolved tokens as CSS custom properties, flat JSON, Sass, and a C++
// header for nova_theme. Enforces WCAG contrast on color.semantic.json's
// contrastChecks. Zero external dependencies.
//
// Usage: node scripts/build-tokens.mjs [--check]
//   --check : validate + contrast-check only, do not write dist/

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "nova/design-tokens/src");
const DIST = join(ROOT, "nova/design-tokens/dist");
const CHECK_ONLY = process.argv.includes("--check");

const readJson = (f) => JSON.parse(readFileSync(join(SRC, f), "utf8"));

// ---------------------------------------------------------------- color helpers
function parseHex(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`invalid hex: "${hex}"`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function relLuminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [f(r), f(g), f(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(hexA, hexB) {
  const L1 = relLuminance(parseHex(hexA));
  const L2 = relLuminance(parseHex(hexB));
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- resolution
function flattenRamps(base) {
  // { blue: { "500": "#.." } }  ->  { "blue.500": "#.." }
  const out = {};
  for (const [ramp, steps] of Object.entries(base)) {
    if (ramp.startsWith("$")) continue;
    for (const [step, val] of Object.entries(steps)) out[`${ramp}.${step}`] = val;
  }
  return out;
}
function resolveRef(ref, ramps) {
  // "{blue.500}"  or  "{blue.500/40}"  (40% alpha -> rgba)
  const m = /^\{([a-z]+\.[0-9]+)(?:\/(\d{1,3}))?\}$/.exec(ref);
  if (!m) throw new Error(`bad semantic reference: "${ref}"`);
  const hex = ramps[m[1]];
  if (!hex) throw new Error(`unknown ramp step: "${m[1]}"`);
  if (m[2] === undefined) return hex;
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${(Number(m[2]) / 100).toFixed(2)})`;
}

// ---------------------------------------------------------------- flatten scale
function flattenScale(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flattenScale(v, key));
    else out[key] = String(v);
  }
  return out;
}

// ---------------------------------------------------------------- main
const baseColors = readJson("color.base.json");
const semantic = readJson("color.semantic.json");
const scale = readJson("scale.json");

const ramps = flattenRamps(baseColors);
// validate every ramp hex up front
for (const [k, v] of Object.entries(ramps)) {
  try { parseHex(v); } catch (e) { fail(`color.base.json: ${k}: ${e.message}`); }
}

const scaleFlat = flattenScale(scale);
const pxKeys = new Set([
  ...Object.keys(scaleFlat).filter((k) =>
    /^(space|radius|size)\./.test(k) && /^\d+$/.test(scaleFlat[k])),
  ...["typography.size.xs","typography.size.sm","typography.size.base","typography.size.md",
      "typography.size.lg","typography.size.xl","typography.size.2xl","typography.size.3xl"],
]);

const themeNames = Object.keys(semantic.themes);
const errors = [];
function fail(msg) { errors.push(msg); }

// resolve each theme's semantic colors
const resolvedThemes = {};
for (const theme of themeNames) {
  const roles = semantic.themes[theme];
  const r = {};
  for (const [role, ref] of Object.entries(roles)) {
    try { r[role] = resolveRef(ref, ramps); }
    catch (e) { fail(`theme "${theme}" role "${role}": ${e.message}`); }
  }
  resolvedThemes[theme] = r;
}

// contrast checks (only on opaque hex pairs)
for (const theme of themeNames) {
  const r = resolvedThemes[theme];
  for (const chk of semantic.contrastChecks) {
    if (!chk.fg || !chk.bg) continue; // skip notes / metadata entries
    const fg = r[chk.fg], bg = r[chk.bg];
    if (!fg || !bg) { fail(`contrastCheck ${theme}: missing ${chk.fg}/${chk.bg}`); continue; }
    if (fg.startsWith("rgba") || bg.startsWith("rgba")) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio < chk.min) {
      fail(`contrast ${theme}: ${chk.fg} on ${chk.bg} = ${ratio.toFixed(2)}:1 < ${chk.min}:1`);
    }
  }
}

if (errors.length) {
  console.error("✗ token build failed:\n  - " + errors.join("\n  - "));
  process.exit(1);
}

// non-color token map (theme-independent)
const scaleTokens = {};
for (const [k, v] of Object.entries(scaleFlat)) {
  scaleTokens[k] = pxKeys.has(k) ? `${v}px` : v;
}

console.log(`✓ ${themeNames.length} themes, ${Object.keys(resolvedThemes.light).length} color roles, ${Object.keys(scaleTokens).length} scale tokens — contrast OK`);

if (CHECK_ONLY) { console.log("✓ --check only, nothing written"); process.exit(0); }

// ---------------------------------------------------------------- emit
mkdirSync(DIST, { recursive: true });
const cssVar = (k) => "--nova-" + k.replace(/\./g, "-");
const HDR = "/* Generated by scripts/build-tokens.mjs — do not edit. SPDX-License-Identifier: MPL-2.0 */\n";

// CSS
let css = HDR + ":root {\n";
for (const [k, v] of Object.entries(scaleTokens)) css += `  ${cssVar(k)}: ${v};\n`;
for (const [k, v] of Object.entries(resolvedThemes.light)) css += `  ${cssVar("color." + k)}: ${v};\n`;
css += "}\n";
for (const theme of themeNames) {
  const sel = theme === "light"
    ? null
    : theme === "dark"
      ? ':root[data-theme="dark"], :root[data-nova-hc="dark"]'
      : `:root[data-theme="${theme}"]`;
  if (theme === "dark") {
    let block = "";
    for (const [k, v] of Object.entries(resolvedThemes.dark)) block += `    ${cssVar("color." + k)}: ${v};\n`;
    css += "\n/* system theme = follow OS when no explicit [data-theme] is set */\n";
    css += "@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n" + block + "  }\n}\n";
  }
  if (sel) {
    css += `${sel} {\n`;
    for (const [k, v] of Object.entries(resolvedThemes[theme])) css += `  ${cssVar("color." + k)}: ${v};\n`;
    css += "}\n";
  }
}
writeFileSync(join(DIST, "nova-tokens.css"), css);

// per-theme flat JSON
for (const theme of themeNames) {
  const flat = { ...scaleTokens };
  for (const [k, v] of Object.entries(resolvedThemes[theme])) flat["color." + k] = v;
  writeFileSync(join(DIST, `nova-tokens.${theme}.json`),
    JSON.stringify({ theme, tokens: flat }, null, 2) + "\n");
}

// Sass
let scss = HDR.replace(/\/\*|\*\//g, (m) => (m === "/*" ? "//" : "")).trim() + "\n";
for (const [k, v] of Object.entries(scaleTokens)) scss += `$nova-${k.replace(/\./g, "-")}: ${v};\n`;
for (const [k, v] of Object.entries(resolvedThemes.light)) scss += `$nova-color-${k.replace(/\./g, "-")}: ${v};\n`;
writeFileSync(join(DIST, "_nova-tokens.scss"), scss);

// C++ header for nova_theme
const ident = (k) => k.replace(/[.\-]/g, "_").toUpperCase();
let hxx = HDR + "#pragma once\n#include <string_view>\n\nnamespace nova::tokens {\n\n";
hxx += "// Theme-independent scale tokens (px values include the \"px\" suffix)\n";
for (const [k, v] of Object.entries(scaleTokens))
  hxx += `inline constexpr std::string_view ${ident(k)} = ${JSON.stringify(v)};\n`;
hxx += "\nenum class Theme { Light, Dark, HcLight, HcDark };\n\n";
const roleEnum = Object.keys(resolvedThemes.light).map((k) => "    " + ident(k)).join(",\n");
hxx += `enum class ColorRole {\n${roleEnum}\n};\n\n`;
hxx += "// Resolved color per theme. Returned as a CSS-style string (\"#rrggbb\" or \"rgba(...)\").\n";
hxx += "inline std::string_view color(Theme t, ColorRole r) {\n";
for (const theme of themeNames) {
  const en = { light: "Light", dark: "Dark", "hc-light": "HcLight", "hc-dark": "HcDark" }[theme];
  hxx += `  if (t == Theme::${en}) switch (r) {\n`;
  for (const [k, v] of Object.entries(resolvedThemes[theme]))
    hxx += `    case ColorRole::${ident(k)}: return ${JSON.stringify(v)};\n`;
  hxx += "  }\n";
}
hxx += "  return {};\n}\n\n} // namespace nova::tokens\n";
writeFileSync(join(DIST, "NovaTokens.hxx"), hxx);

console.log(`✓ wrote dist/: nova-tokens.css, nova-tokens.{${themeNames.join(",")}}.json, _nova-tokens.scss, NovaTokens.hxx`);
