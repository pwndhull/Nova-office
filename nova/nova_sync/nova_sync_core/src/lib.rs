// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// nova_sync_core — sync primitives shared by the Nova client (linked into
// nova_sync via the C ABI in `ffi`) and usable by the reference server.
//
// Scope (docs/sync.md, docs/collaboration-evaluation.md §4):
//   - NovaSyncEnvelope wire codec (`envelope`)
//   - payload integrity via SHA-256 (`envelope::sha256_hex`, `Envelope::verify`)
//   - idempotency key = revision id (`Envelope::is_duplicate_of`)
//   - retry schedule: exponential backoff + full jitter (`backoff`)
//
// NOT YET IMPLEMENTED (declared, tracked in TASKS.md):
//   - Ed25519 envelope signing/verification (`Header::sig` stays empty)
//   - zstd payload compression (caller's responsibility for now)
//   - the commit-graph / conflict-detection state machine (belongs in the
//     C++ `nova_versioning` + `nova_sync` modules; this crate stays a pure,
//     side-effect-free library)

pub mod backoff;
pub mod envelope;
pub mod ffi;

pub use backoff::Backoff;
pub use envelope::{DecodeError, Envelope, Header, Kind};
