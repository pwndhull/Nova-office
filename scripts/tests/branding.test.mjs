// SPDX-License-Identifier: MPL-2.0
// Run: node --test scripts/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYamlMini } from "../lib/yaml-mini.mjs";
import { validate } from "../lib/validate-mini.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const GEN = join(ROOT, "product/generated");

test("yaml-mini: scalars, nesting, comments, quotes, booleans, sequences", () => {
  const y = parseYamlMini(`
# comment
product:
  name: "Nova-Office"   # trailing comment
  count: 7
  ratio: 1.5
  flag: true
  empty: ~
list:
  - a
  - "b c"
  - 3
`);
  assert.equal(y.product.name, "Nova-Office");
  assert.equal(y.product.count, 7);
  assert.equal(y.product.ratio, 1.5);
  assert.equal(y.product.flag, true);
  assert.equal(y.product.empty, null);
  assert.deepEqual(y.list, ["a", "b c", 3]);
});

test("yaml-mini: rejects odd indentation", () => {
  assert.throws(() => parseYamlMini("a:\n   b: 1\n"), /odd indent/);
});

test("validate-mini: catches bad type / pattern / unexpected key", () => {
  const schema = {
    type: "object",
    required: ["v"],
    additionalProperties: false,
    properties: { v: { type: "string", pattern: "^x+$" } },
  };
  assert.equal(validate(schema, { v: "xxx" }).length, 0);
  assert.ok(validate(schema, { v: "y" }).some((e) => /does not match/.test(e)));
  assert.ok(validate(schema, {}).some((e) => /missing required/.test(e)));
  assert.ok(validate(schema, { v: "x", z: 1 }).some((e) => /unexpected property/.test(e)));
});

test("product.yaml is valid against its schema", () => {
  const cfg = parseYamlMini(readFileSync(join(ROOT, "product/product.yaml"), "utf8"));
  const schema = JSON.parse(readFileSync(join(ROOT, "product/schema/product.schema.json"), "utf8"));
  assert.deepEqual(validate(schema, cfg), []);
});

test("gen-branding --check passes; full run emits every artifact", () => {
  const bin = join(ROOT, "scripts/gen-branding.mjs");
  assert.match(execFileSync("node", [bin, "--check"], { encoding: "utf8" }), /valid/);
  execFileSync("node", [bin], { encoding: "utf8" });
  for (const f of [
    "nova_branding.hxx", "Nova-Branding.xcu", "nova-branding.json",
    "Info.plist.fragment", "version.rc.fragment", "nova-mimetypes.xml",
    "banned-literals.json", "nova.writer.desktop", "nova.notes.desktop",
  ]) {
    assert.ok(existsSync(join(GEN, f)), `missing ${f}`);
  }
});

test("generated C++ header: balanced braces, has ProductName + AppName()", () => {
  const h = readFileSync(join(GEN, "nova_branding.hxx"), "utf8");
  assert.match(h, /namespace nova::brand/);
  assert.match(h, /std::string_view ProductName\s*=\s*"Nova-Office"/);
  assert.match(h, /std::string_view AppName\(App a\)/);
  assert.match(h, /TelemetryEnabledByDefault\s*=\s*false/);
  assert.equal((h.match(/\{/g) || []).length, (h.match(/\}/g) || []).length);
});

test("telemetry stays opt-in (TRD Sec 19)", () => {
  const j = JSON.parse(readFileSync(join(GEN, "nova-branding.json"), "utf8"));
  assert.equal(j.telemetry.enabled_by_default, false);
});

test("banned-literals list drives the no-hardcoding CI check", () => {
  const b = JSON.parse(readFileSync(join(GEN, "banned-literals.json"), "utf8"));
  assert.ok(b.literals.includes("Nova-Office"));
  assert.ok(b.literals.includes("Nova Writer"));
});

test("no-hardcoded-branding check passes on the current tree (comments exempt)", () => {
  // Attribution headers ("The Nova-Office contributors") must NOT trip it.
  const out = execFileSync("node", [join(ROOT, "scripts/check-no-hardcoded-branding.mjs")], {
    encoding: "utf8",
  });
  assert.match(out, /no hardcoded branding/);
});
