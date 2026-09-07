// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// C ABI for ycrdt. Consumed by the C++ nova_notes module. Matches
// include/ycrdt.h (hand-written; a build step runs cbindgen to verify).
//
// Ownership: an opaque `NotesDocHandle` is created by `ycrdt_new` /
// `ycrdt_from_snapshot` and freed by `ycrdt_free`. Byte buffers returned by
// `ycrdt_*` are freed by `ycrdt_buf_free`. Strings in are NUL-terminated UTF-8.

use crate::NotesDoc;
use std::ffi::{c_char, CStr};
use std::ptr;
use std::slice;

#[repr(C)]
pub struct YBuf {
    pub data: *mut u8,
    pub len: usize,
}
impl YBuf {
    fn from_vec(mut v: Vec<u8>) -> YBuf {
        v.shrink_to_fit();
        let b = YBuf {
            data: v.as_mut_ptr(),
            len: v.len(),
        };
        std::mem::forget(v);
        b
    }
    fn null() -> YBuf {
        YBuf {
            data: ptr::null_mut(),
            len: 0,
        }
    }
}

pub struct NotesDocHandle(NotesDoc);

/// # Safety
/// `s` must be NUL-terminated UTF-8 or null.
unsafe fn cstr<'a>(s: *const c_char) -> &'a str {
    if s.is_null() {
        ""
    } else {
        CStr::from_ptr(s).to_str().unwrap_or("")
    }
}

#[no_mangle]
pub extern "C" fn ycrdt_new(actor_id: u64) -> *mut NotesDocHandle {
    Box::into_raw(Box::new(NotesDocHandle(NotesDoc::new(actor_id))))
}

/// # Safety
/// `snapshot` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_from_snapshot(
    actor_id: u64,
    snapshot: *const u8,
    len: usize,
) -> *mut NotesDocHandle {
    if snapshot.is_null() {
        return ptr::null_mut();
    }
    match NotesDoc::from_snapshot(actor_id, slice::from_raw_parts(snapshot, len)) {
        Some(d) => Box::into_raw(Box::new(NotesDocHandle(d))),
        None => ptr::null_mut(),
    }
}

/// # Safety
/// `h` must come from `ycrdt_new`/`ycrdt_from_snapshot` and not be used after.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_free(h: *mut NotesDocHandle) {
    if !h.is_null() {
        drop(Box::from_raw(h));
    }
}

/// # Safety
/// `buf` must have been returned by a `ycrdt_*` function.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_buf_free(buf: YBuf) {
    if !buf.data.is_null() {
        drop(Vec::from_raw_parts(buf.data, buf.len, buf.len));
    }
}

macro_rules! handle {
    ($h:expr) => {
        match $h.as_ref() {
            Some(h) => &h.0,
            None => return Default::default(),
        }
    };
}

/// # Safety
/// `h` valid; `id`/`kind` NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_insert_block(
    h: *mut NotesDocHandle,
    index: u32,
    id: *const c_char,
    kind: *const c_char,
) {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return,
    };
    d.insert_block(index, cstr(id), cstr(kind));
}

/// Returns 1 on success, 0 if the parent was not found.
///
/// # Safety
/// `h` valid; strings NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_insert_child_block(
    h: *mut NotesDocHandle,
    parent_id: *const c_char,
    index: u32,
    id: *const c_char,
    kind: *const c_char,
) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    d.insert_child_block(cstr(parent_id), index, cstr(id), cstr(kind)) as i32
}

/// # Safety
/// `h` valid; strings NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_set_block_prop(
    h: *mut NotesDocHandle,
    id: *const c_char,
    key: *const c_char,
    value: *const c_char,
) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    d.set_block_prop(cstr(id), cstr(key), cstr(value)) as i32
}

/// # Safety
/// `h` valid; `id` NUL-terminated UTF-8; `s` NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_block_text_insert(
    h: *mut NotesDocHandle,
    id: *const c_char,
    at: u32,
    s: *const c_char,
) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    d.block_text_insert(cstr(id), at, cstr(s)) as i32
}

/// # Safety
/// `h` valid; `id` NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_block_text_remove(
    h: *mut NotesDocHandle,
    id: *const c_char,
    at: u32,
    len: u32,
) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    d.block_text_remove(cstr(id), at, len) as i32
}

/// # Safety
/// `h` valid; `id` NUL-terminated UTF-8.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_remove_block(h: *mut NotesDocHandle, id: *const c_char) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    d.remove_block(cstr(id)) as i32
}

/// # Safety
/// `h` must be a live handle from `ycrdt_new`/`ycrdt_from_snapshot`.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_state_vector(h: *mut NotesDocHandle) -> YBuf {
    YBuf::from_vec(handle!(h).state_vector())
}

/// # Safety
/// `h` must be a live handle from `ycrdt_new`/`ycrdt_from_snapshot`.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_encode_full(h: *mut NotesDocHandle) -> YBuf {
    YBuf::from_vec(handle!(h).encode_full())
}

/// # Safety
/// `remote_sv` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_encode_diff(
    h: *mut NotesDocHandle,
    remote_sv: *const u8,
    len: usize,
) -> YBuf {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return YBuf::null(),
    };
    let sv = if remote_sv.is_null() {
        &[][..]
    } else {
        slice::from_raw_parts(remote_sv, len)
    };
    YBuf::from_vec(d.encode_diff(sv))
}

/// Apply a peer update. Returns 1 on success, 0 on a malformed update.
///
/// # Safety
/// `update` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_apply_update(
    h: *mut NotesDocHandle,
    update: *const u8,
    len: usize,
) -> i32 {
    let d = match h.as_ref() {
        Some(h) => &h.0,
        None => return 0,
    };
    if update.is_null() {
        return 0;
    }
    d.apply_update(slice::from_raw_parts(update, len)) as i32
}

/// Portable `document.json` (UTF-8). Caller frees with `ycrdt_buf_free`.
///
/// # Safety
/// `h` must be a live handle from `ycrdt_new`/`ycrdt_from_snapshot`.
#[no_mangle]
pub unsafe extern "C" fn ycrdt_document_json(h: *mut NotesDocHandle) -> YBuf {
    YBuf::from_vec(handle!(h).to_document_json().into_bytes())
}

/// ABI version — bump on any breaking change.
#[no_mangle]
pub extern "C" fn ycrdt_abi_version() -> u32 {
    1
}

impl Default for YBuf {
    fn default() -> Self {
        YBuf::null()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn ffi_lifecycle_and_sync() {
        unsafe {
            let a = ycrdt_new(1);
            let id = CString::new("b1").unwrap();
            let kind = CString::new("text").unwrap();
            let hello = CString::new("hello").unwrap();
            ycrdt_insert_block(a, 0, id.as_ptr(), kind.as_ptr());
            assert_eq!(
                ycrdt_block_text_insert(a, id.as_ptr(), 0, hello.as_ptr()),
                1
            );

            let full = ycrdt_encode_full(a);
            let b = ycrdt_from_snapshot(2, full.data, full.len);
            assert!(!b.is_null());

            // edit b, push to a
            let more = CString::new(" world").unwrap();
            ycrdt_block_text_insert(b, id.as_ptr(), 5, more.as_ptr());
            let sv_a = ycrdt_state_vector(a);
            let diff = ycrdt_encode_diff(b, sv_a.data, sv_a.len);
            assert_eq!(ycrdt_apply_update(a, diff.data, diff.len), 1);

            let ja = ycrdt_document_json(a);
            let s = std::str::from_utf8(slice::from_raw_parts(ja.data, ja.len)).unwrap();
            assert!(s.contains("hello world"));

            ycrdt_buf_free(full);
            ycrdt_buf_free(sv_a);
            ycrdt_buf_free(diff);
            ycrdt_buf_free(ja);
            ycrdt_free(a);
            ycrdt_free(b);
        }
    }

    #[test]
    fn ffi_rejects_bad_update() {
        unsafe {
            let a = ycrdt_new(1);
            let bad = [0xffu8; 4];
            assert_eq!(ycrdt_apply_update(a, bad.as_ptr(), bad.len()), 0);
            ycrdt_free(a);
        }
    }

    #[test]
    fn ffi_abi_version() {
        assert_eq!(ycrdt_abi_version(), 1);
    }
}
