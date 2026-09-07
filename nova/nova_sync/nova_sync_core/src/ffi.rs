// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// C ABI for nova_sync (C++). Matches include/nova_sync_core.h — keep them in
// sync (a future build step runs cbindgen to verify). All returned buffers are
// owned by the caller and must be released with `nova_sync_buf_free`.

use crate::backoff::{Backoff, SplitMix64};
use crate::envelope::{Envelope, Kind};
use std::os::raw::{c_char, c_int};
use std::ptr;
use std::slice;

/// Owned byte buffer handed across the ABI.
#[repr(C)]
pub struct NovaBuf {
    pub data: *mut u8,
    pub len: usize,
}

impl NovaBuf {
    fn from_vec(mut v: Vec<u8>) -> NovaBuf {
        v.shrink_to_fit();
        let b = NovaBuf {
            data: v.as_mut_ptr(),
            len: v.len(),
        };
        std::mem::forget(v);
        b
    }
    fn null() -> NovaBuf {
        NovaBuf {
            data: ptr::null_mut(),
            len: 0,
        }
    }
}

/// Release a buffer returned by this library.
///
/// # Safety
/// `buf` must have been produced by a `nova_sync_*` function and not freed before.
#[no_mangle]
pub unsafe extern "C" fn nova_sync_buf_free(buf: NovaBuf) {
    if !buf.data.is_null() {
        drop(Vec::from_raw_parts(buf.data, buf.len, buf.len));
    }
}

fn kind_from_int(k: c_int) -> Option<Kind> {
    match k {
        0 => Some(Kind::YUpdate),
        1 => Some(Kind::Snapshot),
        2 => Some(Kind::Op),
        _ => None,
    }
}

unsafe fn cstr<'a>(p: *const c_char) -> &'a str {
    if p.is_null() {
        return "";
    }
    std::ffi::CStr::from_ptr(p).to_str().unwrap_or("")
}

/// Encode an envelope to an NSE1 frame. Returns a null buffer on bad input.
///
/// # Safety
/// String pointers must be valid NUL-terminated UTF-8 for the call's duration;
/// `payload` must point to `payload_len` readable bytes (or be null with len 0).
#[no_mangle]
pub unsafe extern "C" fn nova_sync_envelope_encode(
    document_id: *const c_char,
    actor: *const c_char,
    base_revision: *const c_char,
    revision: *const c_char,
    kind: c_int,
    timestamp: *const c_char,
    seq: u64,
    payload: *const u8,
    payload_len: usize,
) -> NovaBuf {
    let Some(kind) = kind_from_int(kind) else {
        return NovaBuf::null();
    };
    let payload = if payload.is_null() || payload_len == 0 {
        Vec::new()
    } else {
        slice::from_raw_parts(payload, payload_len).to_vec()
    };
    let e = Envelope::new(
        cstr(document_id),
        cstr(actor),
        cstr(base_revision),
        cstr(revision),
        kind,
        cstr(timestamp),
        seq,
        payload,
    );
    NovaBuf::from_vec(e.encode())
}

/// Decode + integrity-check an NSE1 frame.
/// Returns 1 if the frame parses AND the payload checksum matches, 0 if it
/// parses but fails integrity, negative on parse error.
///
/// On success (>=0) `out_payload` receives the payload bytes (caller frees).
///
/// # Safety
/// `frame` must point to `frame_len` readable bytes; `out_payload` must be a
/// valid writable pointer.
#[no_mangle]
pub unsafe extern "C" fn nova_sync_envelope_decode(
    frame: *const u8,
    frame_len: usize,
    out_payload: *mut NovaBuf,
) -> c_int {
    if frame.is_null() || out_payload.is_null() {
        return -1;
    }
    let bytes = slice::from_raw_parts(frame, frame_len);
    match Envelope::decode(bytes) {
        Ok(e) => {
            let ok = e.verify();
            *out_payload = NovaBuf::from_vec(e.payload);
            if ok {
                1
            } else {
                0
            }
        }
        Err(_) => {
            *out_payload = NovaBuf::null();
            -2
        }
    }
}

/// Extract just the revision id from a frame (for idempotent queue draining).
///
/// # Safety
/// `frame` must point to `frame_len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn nova_sync_envelope_revision(
    frame: *const u8,
    frame_len: usize,
) -> NovaBuf {
    if frame.is_null() {
        return NovaBuf::null();
    }
    match Envelope::decode(slice::from_raw_parts(frame, frame_len)) {
        Ok(e) => NovaBuf::from_vec(e.header.revision.into_bytes()),
        Err(_) => NovaBuf::null(),
    }
}

/// Lowercase-hex SHA-256 of `data` (content addressing).
///
/// # Safety
/// `data` must point to `len` readable bytes (or be null with len 0).
#[no_mangle]
pub unsafe extern "C" fn nova_sync_sha256_hex(data: *const u8, len: usize) -> NovaBuf {
    let slice = if data.is_null() || len == 0 {
        &[][..]
    } else {
        slice::from_raw_parts(data, len)
    };
    NovaBuf::from_vec(crate::envelope::sha256_hex(slice).into_bytes())
}

/// Full-jitter backoff delay in milliseconds for a 0-based `attempt`.
/// `base_ms`/`cap_ms` = 0 → use the docs/sync.md defaults (2000 / 300000).
/// `seed` makes the jitter reproducible (pass a per-document constant).
#[no_mangle]
pub extern "C" fn nova_sync_backoff_delay_ms(
    attempt: u32,
    base_ms: u64,
    cap_ms: u64,
    seed: u64,
) -> u64 {
    let b = Backoff {
        base_ms: if base_ms == 0 { 2_000 } else { base_ms },
        cap_ms: if cap_ms == 0 { 300_000 } else { cap_ms },
        max_attempts: 0,
    };
    let mut rng = SplitMix64(seed ^ ((attempt as u64) << 1 | 1));
    b.delay_ms(attempt, rng.next_f64())
}

/// ABI/semver probe — bump on any breaking ABI change.
#[no_mangle]
pub extern "C" fn nova_sync_core_abi_version() -> u32 {
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn ffi_encode_decode_roundtrip() {
        let doc = CString::new("d1").unwrap();
        let actor = CString::new("a1").unwrap();
        let base = CString::new("").unwrap();
        let rev = CString::new("b3:r").unwrap();
        let ts = CString::new("2026-09-07T00:00:00Z").unwrap();
        let payload = b"payload-bytes";
        unsafe {
            let frame = nova_sync_envelope_encode(
                doc.as_ptr(),
                actor.as_ptr(),
                base.as_ptr(),
                rev.as_ptr(),
                0,
                ts.as_ptr(),
                3,
                payload.as_ptr(),
                payload.len(),
            );
            assert!(!frame.data.is_null());
            let mut out = NovaBuf::null();
            let rc = nova_sync_envelope_decode(frame.data, frame.len, &mut out);
            assert_eq!(rc, 1);
            let got = slice::from_raw_parts(out.data, out.len);
            assert_eq!(got, payload);

            let r = nova_sync_envelope_revision(frame.data, frame.len);
            assert_eq!(slice::from_raw_parts(r.data, r.len), b"b3:r");

            nova_sync_buf_free(frame);
            nova_sync_buf_free(out);
            nova_sync_buf_free(r);
        }
    }

    #[test]
    fn ffi_decode_detects_tamper() {
        let doc = CString::new("d").unwrap();
        let ts = CString::new("t").unwrap();
        unsafe {
            let mut frame = {
                let f = nova_sync_envelope_encode(
                    doc.as_ptr(),
                    doc.as_ptr(),
                    doc.as_ptr(),
                    doc.as_ptr(),
                    1,
                    ts.as_ptr(),
                    0,
                    b"abc".as_ptr(),
                    3,
                );
                slice::from_raw_parts(f.data, f.len).to_vec()
            };
            *frame.last_mut().unwrap() ^= 1;
            let mut out = NovaBuf::null();
            let rc = nova_sync_envelope_decode(frame.as_ptr(), frame.len(), &mut out);
            assert_eq!(rc, 0, "integrity failure must report 0");
            nova_sync_buf_free(out);
        }
    }

    #[test]
    fn ffi_bad_kind_returns_null() {
        let s = CString::new("x").unwrap();
        unsafe {
            let f = nova_sync_envelope_encode(
                s.as_ptr(),
                s.as_ptr(),
                s.as_ptr(),
                s.as_ptr(),
                99,
                s.as_ptr(),
                0,
                ptr::null(),
                0,
            );
            assert!(f.data.is_null());
        }
    }

    #[test]
    fn ffi_backoff_within_window() {
        for attempt in 0..10u32 {
            let d = nova_sync_backoff_delay_ms(attempt, 0, 0, 12345);
            let window = 2_000u64.saturating_mul(1u64 << attempt).min(300_000);
            assert!(d <= window);
        }
    }

    #[test]
    fn ffi_sha256_known_vector() {
        unsafe {
            let b = nova_sync_sha256_hex(b"abc".as_ptr(), 3);
            let hex = std::str::from_utf8(slice::from_raw_parts(b.data, b.len)).unwrap();
            assert_eq!(
                hex,
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
            );
            nova_sync_buf_free(b);
        }
    }

    #[test]
    fn abi_version_is_one() {
        assert_eq!(nova_sync_core_abi_version(), 1);
    }
}
