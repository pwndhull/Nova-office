/**
 * Tracking benchmarks for fuzzy ranking. Not pass/fail — run `npm run bench:track`
 * to compare against a previous run. The pass/fail budgets are in budgets.test.ts.
 */
import { bench, describe } from 'vitest';
import { rankItems, fuzzyMatch } from '@nova/components';
import { syntheticCommands } from './synthetic-commands';

const commands = syntheticCommands(500);

describe('rankItems / 500 commands', () => {
  bench('single char', () => void rankItems('n', commands));
  bench('four chars', () => void rankItems('form', commands));
  bench('no match', () => void rankItems('qqzz', commands));
  bench('empty query (passthrough)', () => void rankItems('', commands));
});

describe('fuzzyMatch', () => {
  bench('exact prefix', () => void fuzzyMatch('form', 'Format'));
  bench('scattered', () => void fuzzyMatch('fmt', 'Find and Replace More Text'));
  bench('reject', () => void fuzzyMatch('zzz', 'Format'));
});
