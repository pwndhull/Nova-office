// SPDX-License-Identifier: MPL-2.0
// Run: node --test nova/design-tokens/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const run = (args) =>
  execFileSync("node", [join(ROOT, "scripts/build-tokens.mjs"), ...args], {
    encoding: "utf8",
  });

test("build passes contrast checks and writes all targets", () => {
  const out = run([]);
  assert.match(out, /contrast OK/);
  for (const f of [
    "nova-tokens.css",
    "nova-tokens.light.json",
    "nova-tokens.dark.json",
    "nova-tokens.hc-light.json",
    "nova-tokens.hc-dark.json",
    "_nova-tokens.scss",
    "NovaTokens.hxx",
  ]) {
    assert.ok(existsSync(join(ROOT, "nova/design-tokens/dist", f)), `missing ${f}`);
  }
});

test("--check does not require dist and still validates", () => {
  const out = run(["--check"]);
  assert.match(out, /nothing written/);
});

test("every semantic role is present in every theme", () => {
  const sem = JSON.parse(
    readFileSync(join(ROOT, "nova/design-tokens/src/color.semantic.json"), "utf8"),
  );
  const themes = Object.entries(sem.themes);
  const roleSet = (t) => new Set(Object.keys(t));
  const base = roleSet(themes[0][1]);
  for (const [name, roles] of themes) {
    assert.deepEqual(
      roleSet(roles),
      base,
      `theme "${name}" role set differs from "${themes[0][0]}"`,
    );
  }
});

test("generated CSS exposes accent + focus tokens for light and dark", () => {
  const css = readFileSync(
    join(ROOT, "nova/design-tokens/dist/nova-tokens.css"),
    "utf8",
  );
  assert.match(css, /--nova-color-accent-solid:/);
  assert.match(css, /--nova-color-focus-ring:/);
  assert.match(css, /prefers-color-scheme: dark/);
  assert.match(css, /\[data-theme="hc-dark"\]/);
});

test("generated C++ header is well-formed", () => {
  const hxx = readFileSync(
    join(ROOT, "nova/design-tokens/dist/NovaTokens.hxx"),
    "utf8",
  );
  assert.match(hxx, /namespace nova::tokens/);
  assert.match(hxx, /enum class Theme/);
  assert.match(hxx, /enum class ColorRole/);
  assert.match(hxx, /std::string_view color\(Theme t, ColorRole r\)/);
  assert.equal((hxx.match(/\{/g) || []).length, (hxx.match(/\}/g) || []).length);
});

test("no raw color literal leaks: semantic values are all references", () => {
  const sem = JSON.parse(
    readFileSync(join(ROOT, "nova/design-tokens/src/color.semantic.json"), "utf8"),
  );
  for (const [theme, roles] of Object.entries(sem.themes)) {
    for (const [role, val] of Object.entries(roles)) {
      assert.match(val, /^\{[a-z]+\.[0-9]+(\/\d{1,3})?\}$/, `${theme}.${role} = ${val}`);
    }
  }
});
