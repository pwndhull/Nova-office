/**
 * Minimal ambient declarations for the Node built-ins these tests use.
 *
 * @nova/tests deliberately does not depend on `@types/node`: the whole
 * dependency tree is installed from one shared lockfile by several sessions at
 * once, and adding a dev dep here is a lockfile conflict waiting to happen. The
 * tests run under vitest (esbuild resolves `node:*` natively); this file only
 * exists so `tsc --noEmit` has types for the handful of APIs touched.
 *
 * Replace with `@types/node` once the workspace has it.
 */

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
  export function join(...segments: string[]): string;
  export function dirname(path: string): string;
}

declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options?: { stdio?: 'ignore' | 'inherit' | 'pipe' },
  ): Buffer;
}

declare const process: { cwd(): string };
