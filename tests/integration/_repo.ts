/**
 * Repo-root resolution that survives vitest's `/@fs/` rewriting of
 * `import.meta.url`. Walks up from the current working directory (the workspace
 * dir when run through npm) until it finds the root manifest.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function findRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    try {
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        name?: string;
      };
      if (manifest.name === 'nova-office') return dir;
    } catch {
      /* keep walking */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate the nova-office repo root from ${start}`);
}

export const REPO_ROOT = findRoot(process.cwd());
export const repoPath = (rel: string) => resolve(REPO_ROOT, rel);
export const readRepo = (rel: string) => readFileSync(repoPath(rel), 'utf8');
