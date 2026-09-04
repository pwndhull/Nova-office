/**
 * Performance budgets.
 *
 * These are the computational hot paths that already exist and already run on
 * every interaction: fuzzy ranking on each palette keystroke, spring evaluation
 * on each animation frame, and the token build that gates CI. Each is measured
 * against a documented budget in budgets.json with ~2x headroom, so a red test
 * is a real regression rather than noise.
 *
 * App-level budgets (startup, scroll, first paint) land with the app surfaces
 * in Phase 13 — see tests/README.md.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { rankItems } from '@nova/components';
import { springValueAt, springs } from '@nova/motion';
import { median, type Budget } from './measure';
import { syntheticCommands } from './synthetic-commands';
import { readRepo, repoPath } from '../integration/_repo';

const { budgets } = JSON.parse(readRepo('tests/benchmarks/budgets.json')) as {
  budgets: Record<string, Budget>;
};

const check = (name: string, run: (b: Budget) => number) => {
  const budget = budgets[name]!;
  it(`${name} — ${budget.description}`, () => {
    const ms = run(budget);
    expect(
      ms,
      `${name}: ${ms.toFixed(2)}ms exceeds the ${budget.maxMs}ms budget`,
    ).toBeLessThan(budget.maxMs);
  });
};

describe('fuzzy ranking', () => {
  const commands = syntheticCommands(500);

  check('fuzzy.rank.500-commands', (b) =>
    median(b.iterations, () => void rankItems('form', commands)),
  );

  check('fuzzy.rank.cold-first-keystroke', (b) =>
    median(b.iterations, () => void rankItems('n', commands)),
  );
});

describe('spring solver', () => {
  check('motion.spring.10k-samples', (b) =>
    median(b.iterations, () => {
      for (let i = 0; i < 10_000; i += 1) springValueAt(springs.snappy, (i % 500) / 1000);
    }),
  );
});

describe('token build', () => {
  check('tokens.build', () => {
    const start = performance.now();
    execFileSync('node', [repoPath('ui/tokens/build.mjs')], { stdio: 'ignore' });
    return performance.now() - start;
  });
});
