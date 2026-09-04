/**
 * Fuzzy matching for the command palette and global search.
 *
 * The scoring is deliberately opinionated, because ranking is what separates a
 * palette people use from one they abandon. Three rules drive it:
 *
 *  1. A match at a word boundary is worth far more than one mid-word — typing
 *     "np" should find "New Presentation", not "Snap to Grid".
 *  2. Consecutive matches beat scattered ones, so "form" prefers "Format" over
 *     "Find and Replace More".
 *  3. Shorter targets win ties, because a short name that matches is almost
 *     always the more specific command.
 */

export interface FuzzyMatch {
  score: number;
  /** Indices of matched characters, for highlighting. Ascending. */
  indices: number[];
}

const SCORE_EXACT_PREFIX = 1000;
const SCORE_WORD_BOUNDARY = 80;
const SCORE_CONSECUTIVE = 60;
const SCORE_CAMEL_BOUNDARY = 70;
const SCORE_CHARACTER = 10;
const PENALTY_LEADING = 3;
const PENALTY_GAP = 4;

const isBoundary = (text: string, index: number): boolean => {
  if (index === 0) return true;
  const previous = text[index - 1]!;
  return previous === ' ' || previous === '-' || previous === '_' || previous === '/' || previous === '.';
};

const isCamelBoundary = (text: string, index: number): boolean => {
  if (index === 0) return false;
  const previous = text[index - 1]!;
  const current = text[index]!;
  return previous === previous.toLowerCase() && current === current.toUpperCase();
};

/**
 * Score `query` against `target`.
 *
 * Returns `null` when the query's characters do not all appear in order — the
 * caller filters on that rather than on a score threshold, so a deliberately
 * weak match is still shown if nothing better exists.
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (query.length === 0) return { score: 0, indices: [] };
  if (query.length > target.length) return null;

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Fast path: an exact prefix is unambiguously the best kind of match.
  if (lowerTarget.startsWith(lowerQuery)) {
    return {
      score: SCORE_EXACT_PREFIX + (100 - Math.min(100, target.length)),
      indices: Array.from({ length: query.length }, (_, i) => i),
    };
  }

  const indices: number[] = [];
  let score = 0;
  let targetIndex = 0;
  let previousMatchIndex = -1;

  for (let queryIndex = 0; queryIndex < lowerQuery.length; queryIndex += 1) {
    const char = lowerQuery[queryIndex]!;

    // Prefer a boundary match over the nearest match: scan ahead for one before
    // settling for the first occurrence.
    let found = -1;
    let boundaryCandidate = -1;

    for (let i = targetIndex; i < lowerTarget.length; i += 1) {
      if (lowerTarget[i] !== char) continue;
      if (found === -1) found = i;
      if (isBoundary(target, i) || isCamelBoundary(target, i)) {
        boundaryCandidate = i;
        break;
      }
    }

    // Only jump to a boundary match if it is close by; a boundary match on the
    // far side of the string is a worse result than the adjacent one.
    const matchIndex =
      boundaryCandidate !== -1 && boundaryCandidate - found <= 12 ? boundaryCandidate : found;

    if (matchIndex === -1) return null;

    indices.push(matchIndex);
    score += SCORE_CHARACTER;

    if (isBoundary(target, matchIndex)) score += SCORE_WORD_BOUNDARY;
    else if (isCamelBoundary(target, matchIndex)) score += SCORE_CAMEL_BOUNDARY;

    if (previousMatchIndex !== -1) {
      if (matchIndex === previousMatchIndex + 1) {
        score += SCORE_CONSECUTIVE;
      } else {
        // Gaps cost, but the cost is capped so a late match in a long label is
        // not scored into oblivion.
        score -= Math.min(PENALTY_GAP * (matchIndex - previousMatchIndex - 1), 40);
      }
    } else {
      // Characters skipped before the first match cost a little.
      score -= Math.min(PENALTY_LEADING * matchIndex, 30);
    }

    previousMatchIndex = matchIndex;
    targetIndex = matchIndex + 1;
  }

  // Shorter targets win ties: a short name that matches is usually the more
  // specific command.
  score += Math.max(0, 40 - target.length);

  return { score, indices };
}

export interface Rankable {
  /** Primary text the query is matched against. */
  label: string;
  /** Secondary text — a category or path. Matched at a discount. */
  group?: string;
  /** Extra terms that should find this item without being displayed. */
  keywords?: string[];
}

export interface RankedResult<T> {
  item: T;
  score: number;
  /** Indices into `label`, for highlighting. Empty when matched via keywords. */
  indices: number[];
}

const KEYWORD_DISCOUNT = 0.6;
const GROUP_DISCOUNT = 0.4;

/**
 * Rank items against a query.
 *
 * With an empty query the original order is preserved — the caller has usually
 * already sorted by recency, and re-sorting an empty search by score would
 * scramble that.
 */
export function rankItems<T extends Rankable>(query: string, items: T[]): Array<RankedResult<T>> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return items.map((item) => ({ item, score: 0, indices: [] }));
  }

  const results: Array<RankedResult<T>> = [];

  for (const item of items) {
    const labelMatch = fuzzyMatch(trimmed, item.label);
    let best = labelMatch ? { score: labelMatch.score, indices: labelMatch.indices } : null;

    // Keywords let "dark mode" find "Appearance" without cluttering the label.
    for (const keyword of item.keywords ?? []) {
      const match = fuzzyMatch(trimmed, keyword);
      if (!match) continue;
      const score = match.score * KEYWORD_DISCOUNT;
      if (!best || score > best.score) best = { score, indices: [] };
    }

    if (item.group) {
      const match = fuzzyMatch(trimmed, item.group);
      if (match) {
        const score = match.score * GROUP_DISCOUNT;
        if (!best || score > best.score) best = { score, indices: [] };
      }
    }

    if (best) results.push({ item, score: best.score, indices: best.indices });
  }

  return results.sort((a, b) => b.score - a.score);
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/**
 * Split text into matched and unmatched runs, for rendering.
 *
 * Returns runs rather than per-character segments so the DOM stays small — a
 * palette re-renders this on every keystroke.
 */
export function highlightSegments(text: string, indices: number[]): HighlightSegment[] {
  if (indices.length === 0) return [{ text, matched: false }];

  const matched = new Set(indices);
  const segments: HighlightSegment[] = [];
  let current = '';
  let currentMatched = matched.has(0);

  for (let i = 0; i < text.length; i += 1) {
    const isMatched = matched.has(i);
    if (isMatched !== currentMatched) {
      if (current) segments.push({ text: current, matched: currentMatched });
      current = '';
      currentMatched = isMatched;
    }
    current += text[i];
  }
  if (current) segments.push({ text: current, matched: currentMatched });

  return segments;
}
