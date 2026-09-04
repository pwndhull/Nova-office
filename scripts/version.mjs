#!/usr/bin/env node
/**
 * Nova Office version tool.
 *
 * One source of truth for the version string: the latest `v*` git tag, plus
 * commit distance for anything built after it. The same string is written into
 * every package.json and (downstream) read into the engine's product-version
 * resources at configure time, so the web packages and the native app can never
 * disagree about what release they are.
 *
 *   node scripts/version.mjs print [--plain]
 *   node scripts/version.mjs bump <major|minor|patch> [--no-tag] [--dry-run]
 *
 * Dependency-free on purpose: it runs in CI before `npm ci`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Run git, returning trimmed stdout, or null if it fails (e.g. no repo). */
function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** package.json files the version is mirrored into. */
function packageManifests() {
  const root = join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(root, 'utf8'));
  const globs = pkg.workspaces ?? [];
  const manifests = [root];
  for (const ws of globs) {
    // Workspaces here are concrete paths, not globs.
    const candidate = join(ROOT, ws, 'package.json');
    try {
      readFileSync(candidate);
      manifests.push(candidate);
    } catch {
      // Workspace without its own manifest yet — skip.
    }
  }
  return manifests;
}

const FALLBACK = '0.1.0';

/** The latest semver tag of the form vX.Y.Z, or null. */
function latestTag() {
  const described = git('describe', '--tags', '--match', 'v[0-9]*', '--abbrev=0');
  if (described && /^v\d+\.\d+\.\d+$/.test(described)) return described;
  return null;
}

/**
 * Resolve the current version.
 *   on a tagged commit         -> "1.4.0"
 *   3 commits after v1.4.0      -> "1.4.0+3.g1a2b3c4"
 *   no tags at all             -> FALLBACK (+ distance from root if in a repo)
 *   dirty working tree         -> trailing ".dirty"
 */
function resolveVersion() {
  const tag = latestTag();
  const base = tag ? tag.slice(1) : FALLBACK;

  let distance = 0;
  let sha = git('rev-parse', '--short', 'HEAD');
  if (tag) {
    const count = git('rev-list', '--count', `${tag}..HEAD`);
    distance = count ? Number(count) : 0;
  } else if (sha) {
    const count = git('rev-list', '--count', 'HEAD');
    distance = count ? Number(count) : 0;
  }

  const dirty = git('status', '--porcelain') ? '.dirty' : '';
  if (distance === 0 && !dirty) return base;
  const meta = [distance, sha && `g${sha}`].filter(Boolean).join('.');
  return `${base}+${meta}${dirty}`;
}

/** The clean MAJOR.MINOR.PATCH the manifests should carry (no build metadata). */
function manifestVersion() {
  const tag = latestTag();
  return tag ? tag.slice(1) : FALLBACK;
}

function bump(kind, { tag = true, dryRun = false } = {}) {
  if (!['major', 'minor', 'patch'].includes(kind)) {
    fail(`bump expects major|minor|patch, got "${kind}"`);
  }
  if (!dryRun && git('status', '--porcelain')) {
    fail('working tree is dirty — commit or stash before bumping');
  }

  const [maj, min, pat] = manifestVersion().split('.').map(Number);
  const next =
    kind === 'major' ? `${maj + 1}.0.0` : kind === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;

  const manifests = packageManifests();
  console.error(`${manifestVersion()} -> ${next}`);
  for (const file of manifests) {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    json.version = next;
    console.error(`  ${dryRun ? 'would write' : 'write'} ${file.replace(ROOT + '/', '')}`);
    if (!dryRun) writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  }

  if (dryRun) return next;

  git('add', ...manifests);
  git('commit', '-m', `Release v${next}`);
  if (tag) {
    git('tag', '-a', `v${next}`, '-m', `Nova Office ${next}`);
    console.error(`tagged v${next}`);
  }
  return next;
}

function fail(msg) {
  console.error(`version: ${msg}`);
  process.exit(1);
}

// --- CLI --------------------------------------------------------------------

const [, , command, ...rest] = process.argv;
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const positional = rest.filter((a) => !a.startsWith('--'));

switch (command) {
  case 'print': {
    const version = resolveVersion();
    process.stdout.write(flags.has('--plain') ? version : `Nova Office ${version}\n`);
    break;
  }
  case 'bump': {
    bump(positional[0], { tag: !flags.has('--no-tag'), dryRun: flags.has('--dry-run') });
    break;
  }
  case 'manifest': {
    // The clean string, for tooling that needs it without build metadata.
    process.stdout.write(manifestVersion() + '\n');
    break;
  }
  default:
    console.error('usage: version.mjs <print [--plain] | bump <major|minor|patch> [--no-tag] [--dry-run] | manifest>');
    process.exit(command ? 1 : 0);
}
