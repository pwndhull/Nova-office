#!/usr/bin/env node
/**
 * Assemble the distributable playground bundle.
 *
 *   node scripts/pack-playground.mjs <staging-dir>
 *
 * Produces <staging-dir>/nova-office-playground/ containing:
 *   dist/        the built static site (from ui/playground/dist)
 *   serve.mjs    zero-dependency static server
 *   README.md    instructions, with @VERSION@ / @REF@ / @DATE@ filled in
 *
 * The caller (CI, or a person) turns that directory into a .tar.gz / .zip.
 * Dependency-free on purpose — it runs in CI right after `npm run build`.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const stagingArg = process.argv[2];
if (!stagingArg) {
  console.error('usage: node scripts/pack-playground.mjs <staging-dir>');
  process.exit(2);
}

const distSrc = join(ROOT, 'ui/playground/dist');
if (!existsSync(join(distSrc, 'index.html'))) {
  console.error(`no build found at ${distSrc} — run \`npm run build\` first`);
  process.exit(1);
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function version() {
  try {
    return execFileSync('node', ['scripts/version.mjs', 'print', '--plain'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  }
}

const V = process.env.NOVA_VERSION || version();
const REF = process.env.NOVA_REF || git('rev-parse', '--abbrev-ref', 'HEAD') || 'nova-main';
const DATE = new Date().toISOString().slice(0, 10);

const outRoot = join(stagingArg, 'nova-office-playground');
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

cpSync(distSrc, join(outRoot, 'dist'), { recursive: true });
cpSync(join(ROOT, 'packaging/playground/serve.mjs'), join(outRoot, 'serve.mjs'));

const readme = readFileSync(join(ROOT, 'packaging/playground/README.md'), 'utf8')
  .replaceAll('@VERSION@', V)
  .replaceAll('@REF@', REF)
  .replaceAll('@DATE@', DATE);
writeFileSync(join(outRoot, 'README.md'), readme);

// A machine-readable stamp, so a downloaded bundle can be traced to a commit.
writeFileSync(
  join(outRoot, 'BUILD-INFO.json'),
  JSON.stringify(
    { name: 'nova-office-playground', version: V, ref: REF, commit: git('rev-parse', 'HEAD'), date: DATE },
    null,
    2,
  ) + '\n',
);

console.log(`staged ${outRoot} (version ${V}, ref ${REF})`);
