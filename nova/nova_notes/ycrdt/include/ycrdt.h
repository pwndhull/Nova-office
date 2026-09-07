/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 The Nova-Office contributors
 *
 * C ABI for ycrdt (Rust) — the Nova Notes block-tree CRDT (ADR-0003).
 * Hand-written; a build step runs cbindgen to verify it matches src/ffi.rs.
 * Consumed by the C++ nova_notes module.
 *
 * Memory:
 *   - NotesDocHandle*  from ycrdt_new / ycrdt_from_snapshot, freed by ycrdt_free.
 *   - YBuf returned by any ycrdt_* function is caller-owned; free with
 *     ycrdt_buf_free exactly once.
 * Strings passed in are NUL-terminated UTF-8. Positions/lengths are in UTF-16
 * code units (yrs text indexing).
 */
#ifndef YCRDT_H
#define YCRDT_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct NotesDocHandle NotesDocHandle;

typedef struct YBuf {
    uint8_t *data;
    size_t   len;
} YBuf;

/* ---- lifecycle ---------------------------------------------------------- */

/* actor_id = the yrs client id; MUST be unique per device. 0 = random. */
NotesDocHandle *ycrdt_new(uint64_t actor_id);

/* Rebuild from a full-state update (snapshot). NULL on a malformed snapshot. */
NotesDocHandle *ycrdt_from_snapshot(uint64_t actor_id, const uint8_t *snapshot, size_t len);

void ycrdt_free(NotesDocHandle *h);
void ycrdt_buf_free(YBuf buf);

/* ---- editing (return 1 = ok, 0 = target not found) --------------------- */

void    ycrdt_insert_block(NotesDocHandle *h, uint32_t index, const char *id, const char *kind);
int32_t ycrdt_insert_child_block(NotesDocHandle *h, const char *parent_id,
                                 uint32_t index, const char *id, const char *kind);
int32_t ycrdt_set_block_prop(NotesDocHandle *h, const char *id, const char *key, const char *value);
int32_t ycrdt_block_text_insert(NotesDocHandle *h, const char *id, uint32_t at, const char *s);
int32_t ycrdt_block_text_remove(NotesDocHandle *h, const char *id, uint32_t at, uint32_t len);
int32_t ycrdt_remove_block(NotesDocHandle *h, const char *id);

/* ---- sync ------------------------------------------------------------- */

/* This replica's state vector — send to a peer; it replies with a diff. */
YBuf ycrdt_state_vector(NotesDocHandle *h);
/* Everything the peer (described by remote_sv) is missing. */
YBuf ycrdt_encode_diff(NotesDocHandle *h, const uint8_t *remote_sv, size_t len);
/* Full state as an update (fresh peer / snapshot). */
YBuf ycrdt_encode_full(NotesDocHandle *h);
/* Apply a peer update. 1 = ok, 0 = malformed. */
int32_t ycrdt_apply_update(NotesDocHandle *h, const uint8_t *update, size_t len);

/* ---- read ------------------------------------------------------------ */

/* Portable document.json (UTF-8) for the .nova package / degraded readers. */
YBuf ycrdt_document_json(NotesDocHandle *h);

/* ABI version — bump on any breaking change. Currently 1. */
uint32_t ycrdt_abi_version(void);

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* YCRDT_H */
