/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 The Nova-Office contributors
 *
 * C ABI for nova_sync_core (Rust). Hand-written; a build step runs cbindgen to
 * verify it matches src/ffi.rs. Consumed by the C++ nova_sync module and by the
 * reference server if it links the static lib.
 *
 * Memory: every NovaBuf returned by a nova_sync_* function is owned by the
 * caller and MUST be released with nova_sync_buf_free exactly once.
 */
#ifndef NOVA_SYNC_CORE_H
#define NOVA_SYNC_CORE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct NovaBuf {
    uint8_t *data;
    size_t   len;
} NovaBuf;

/* NovaSyncEnvelope kind (docs/collaboration-evaluation.md §4) */
enum {
    NOVA_SYNC_KIND_YUPDATE  = 0, /* Yrs update — Notes / metadata / comments   */
    NOVA_SYNC_KIND_SNAPSHOT = 1, /* Office document revision blob (whole/delta) */
    NOVA_SYNC_KIND_OP       = 2  /* LOK live-session message                    */
};

/* Release a buffer produced by this library. Safe on a {NULL,0} buffer. */
void nova_sync_buf_free(NovaBuf buf);

/* Encode an NSE1 frame. Returns {NULL,0} on invalid input (e.g. bad kind).
 * Strings are NUL-terminated UTF-8. payload may be NULL iff payload_len == 0. */
NovaBuf nova_sync_envelope_encode(const char *document_id,
                                  const char *actor,
                                  const char *base_revision,
                                  const char *revision,
                                  int         kind,
                                  const char *timestamp,
                                  uint64_t    seq,
                                  const uint8_t *payload,
                                  size_t         payload_len);

/* Decode + integrity-check a frame.
 *   return  1 : parsed and payload checksum matches
 *   return  0 : parsed but integrity FAILED (do not trust the payload)
 *   return <0 : parse error (out_payload set to {NULL,0})
 * On return >= 0, *out_payload receives the payload bytes (caller frees). */
int nova_sync_envelope_decode(const uint8_t *frame,
                              size_t         frame_len,
                              NovaBuf       *out_payload);

/* Extract the revision id (idempotency key for queue draining).
 * Returns {NULL,0} on parse error. */
NovaBuf nova_sync_envelope_revision(const uint8_t *frame, size_t frame_len);

/* Lowercase-hex SHA-256 of data (content addressing). */
NovaBuf nova_sync_sha256_hex(const uint8_t *data, size_t len);

/* Full-jitter exponential backoff delay (ms) for a 0-based attempt.
 * base_ms / cap_ms == 0 -> defaults (2000 / 300000, docs/sync.md).
 * seed makes jitter reproducible (pass a per-document constant). */
uint64_t nova_sync_backoff_delay_ms(uint32_t attempt,
                                    uint64_t base_ms,
                                    uint64_t cap_ms,
                                    uint64_t seed);

/* ABI version — bump on any breaking change. Currently 1. */
uint32_t nova_sync_core_abi_version(void);

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* NOVA_SYNC_CORE_H */
