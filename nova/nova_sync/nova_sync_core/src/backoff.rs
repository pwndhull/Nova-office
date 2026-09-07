// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// Retry schedule for the sync engine (docs/sync.md §1): exponential backoff
// with a cap and *full jitter* (AWS "Exponential Backoff and Jitter"). Resumable
// and deterministic given the RNG seed, so it is testable.

/// Backoff policy. Defaults match docs/sync.md: base 2s, cap 5m.
#[derive(Debug, Clone, Copy)]
pub struct Backoff {
    pub base_ms: u64,
    pub cap_ms: u64,
    /// Give up after this many attempts (0 = never give up).
    pub max_attempts: u32,
}

impl Default for Backoff {
    fn default() -> Self {
        Backoff {
            base_ms: 2_000,
            cap_ms: 300_000,
            max_attempts: 0,
        }
    }
}

impl Backoff {
    /// Upper bound of the delay window for a 0-based attempt index, before jitter:
    /// `min(cap, base * 2^attempt)`, saturating.
    pub fn window_ms(&self, attempt: u32) -> u64 {
        let factor = 1u64.checked_shl(attempt).unwrap_or(u64::MAX);
        self.base_ms.saturating_mul(factor).min(self.cap_ms)
    }

    /// Full-jitter delay: uniform in `[0, window_ms(attempt)]`.
    /// `rand01` must be in `[0, 1)`.
    pub fn delay_ms(&self, attempt: u32, rand01: f64) -> u64 {
        let w = self.window_ms(attempt) as f64;
        (w * rand01.clamp(0.0, 1.0)).floor() as u64
    }

    pub fn should_retry(&self, attempt_about_to_start: u32) -> bool {
        self.max_attempts == 0 || attempt_about_to_start < self.max_attempts
    }
}

/// Tiny deterministic PRNG (SplitMix64) so the engine's jitter is reproducible
/// in tests and after a resume. Not for cryptographic use.
pub struct SplitMix64(pub u64);
impl SplitMix64 {
    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    /// Uniform f64 in [0, 1).
    pub fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_grow_then_cap() {
        let b = Backoff::default();
        assert_eq!(b.window_ms(0), 2_000);
        assert_eq!(b.window_ms(1), 4_000);
        assert_eq!(b.window_ms(2), 8_000);
        assert_eq!(b.window_ms(7), 256_000);
        assert_eq!(b.window_ms(8), 300_000); // capped
        assert_eq!(b.window_ms(60), 300_000); // no overflow
    }

    #[test]
    fn full_jitter_stays_in_window() {
        let b = Backoff::default();
        let mut rng = SplitMix64(42);
        for _ in 0..10_000 {
            let a = (rng.next_u64() % 12) as u32;
            let d = b.delay_ms(a, rng.next_f64());
            assert!(d <= b.window_ms(a));
        }
    }

    #[test]
    fn jitter_is_deterministic_for_a_seed() {
        let seq = |seed| {
            let mut r = SplitMix64(seed);
            (0..5).map(|_| r.next_f64()).collect::<Vec<_>>()
        };
        assert_eq!(seq(7), seq(7));
        assert_ne!(seq(7), seq(8));
    }

    #[test]
    fn max_attempts_respected() {
        let b = Backoff {
            max_attempts: 3,
            ..Backoff::default()
        };
        assert!(b.should_retry(0));
        assert!(b.should_retry(2));
        assert!(!b.should_retry(3));
        assert!(Backoff::default().should_retry(9_999)); // 0 = forever
    }

    #[test]
    fn delay_endpoints() {
        let b = Backoff::default();
        assert_eq!(b.delay_ms(3, 0.0), 0);
        assert_eq!(b.delay_ms(3, 0.999_999), b.window_ms(3) - 1);
    }
}
