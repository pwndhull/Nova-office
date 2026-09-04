/** Minimal timing helper: run `fn` `iterations` times, return the median ms. */
export function median(iterations: number, fn: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)]!;
}

export interface Budget {
  description: string;
  maxMs: number;
  iterations: number;
}
