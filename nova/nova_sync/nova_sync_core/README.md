<!-- SPDX-License-Identifier: MPL-2.0 -->
# nova_sync_core

Rust sync primitives, linked into the C++ `nova_sync` module via a C ABI
(`include/nova_sync_core.h`). Also usable by the reference server.

## Implemented

| Piece | File | Notes |
|-------|------|-------|
| `NovaSyncEnvelope` wire codec | `src/envelope.rs` | `NSE1` frame: `magic + u32 header-len + JSON header + opaque payload` (docs/collaboration-evaluation.md §4) |
| Payload integrity | `src/envelope.rs` | SHA-256 in the header; `Envelope::verify` / FFI `decode` returns 0 on mismatch |
| Idempotency key | `src/envelope.rs` | `revision` id — makes queue draining safe on retry (docs/sync.md §1) |
| Retry schedule | `src/backoff.rs` | exponential backoff, cap, **full jitter**; deterministic PRNG for testable/resumable jitter |
| C ABI | `src/ffi.rs` + `include/nova_sync_core.h` | `encode` / `decode` / `revision` / `sha256_hex` / `backoff_delay_ms` / `abi_version`; caller-owned `NovaBuf`, freed by `nova_sync_buf_free` |

## NOT YET IMPLEMENTED (tracked in `../../../../TASKS.md`)

- Ed25519 envelope signing / verification (`Header::sig` is a declared field,
  currently always empty; `verify` does not require it). **EXPERIMENTAL.**
- zstd payload compression (caller's responsibility for now).
- The commit-graph / conflict-detection state machine — belongs in the C++
  `nova_versioning` + `nova_sync` modules; this crate stays a pure library.

## Build & test

```bash
cargo test                       # 18 unit tests (envelope, backoff, FFI)
cargo build --release            # staticlib -> target/release/libnova_sync_core.a
```

The LibreOffice build links the staticlib via a `Nova_Rust.mk` gbuild class
(`cargo build --release` + this header) — see
[`../../../../docs/architecture.md`](../../../../docs/architecture.md) §10.
**`Nova_Rust.mk` itself is NOT IMPLEMENTED** (needs the build host).

## Dependencies

`sha2` (MIT/Apache-2.0), `serde` + `serde_json` (MIT/Apache-2.0) — all
permissive, listed in [`../../../../docs/dependency-map.md`](../../../../docs/dependency-map.md).
