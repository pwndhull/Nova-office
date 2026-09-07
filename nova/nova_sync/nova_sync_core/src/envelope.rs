// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// NovaSyncEnvelope — the provider-neutral unit of synchronization
// (docs/collaboration-evaluation.md §4, docs/sync.md).
//
// Wire format (self-describing, debuggable, transport-agnostic):
//
//   magic:   4 bytes  "NSE1"
//   hlen:    4 bytes  big-endian u32  — length of the header JSON
//   header:  hlen bytes  — UTF-8 JSON (see `Header`)
//   payload: rest of the frame  — opaque bytes (Yrs update | snapshot | op batch),
//            already compressed by the caller if desired
//
// The header carries a SHA-256 of the payload; `Envelope::verify` re-checks it.
// Signing (Ed25519 over magic+hlen+header) is a declared field but NOT YET
// IMPLEMENTED — `sig` stays empty and `verify` does not require it. EXPERIMENTAL.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const MAGIC: &[u8; 4] = b"NSE1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    /// Yrs update — Nova Notes / metadata / comments. Server merges via Yrs.
    YUpdate,
    /// Whole or delta revision blob of an Office document.
    Snapshot,
    /// LOK live-session message (only meaningful inside a session).
    Op,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Header {
    pub document_id: String,   // UUID
    pub actor: String,         // ActorId — hash of device Ed25519 pubkey + user id
    pub base_revision: String, // content hash this envelope builds on ("" for genesis)
    pub revision: String,      // content hash of the result — envelopes are idempotent by this
    pub kind: Kind,
    pub checksum: String,  // lowercase hex SHA-256 of the payload
    pub timestamp: String, // RFC3339
    #[serde(default)]
    pub seq: u64, // monotonic per-actor sequence (replay protection)
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub sig: String, // hex Ed25519 sig — NOT YET IMPLEMENTED
}

#[derive(Debug, Clone)]
pub struct Envelope {
    pub header: Header,
    pub payload: Vec<u8>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DecodeError {
    TooShort,
    BadMagic,
    BadHeaderLen,
    HeaderNotJson,
    HeaderLenMismatch,
}

impl core::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let s = match self {
            DecodeError::TooShort => "frame too short",
            DecodeError::BadMagic => "bad magic (not an NSE1 frame)",
            DecodeError::BadHeaderLen => "header length exceeds frame",
            DecodeError::HeaderNotJson => "header is not valid JSON",
            DecodeError::HeaderLenMismatch => "declared header length disagrees with content",
        };
        f.write_str(s)
    }
}
impl std::error::Error for DecodeError {}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    let d = h.finalize();
    let mut s = String::with_capacity(64);
    for b in d {
        s.push(char::from_digit((b >> 4) as u32, 16).unwrap());
        s.push(char::from_digit((b & 0xf) as u32, 16).unwrap());
    }
    s
}

impl Envelope {
    /// Build an envelope, computing the payload checksum.
    /// The parameters map 1:1 to the wire header fields (docs/collaboration-evaluation.md §4).
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        document_id: impl Into<String>,
        actor: impl Into<String>,
        base_revision: impl Into<String>,
        revision: impl Into<String>,
        kind: Kind,
        timestamp: impl Into<String>,
        seq: u64,
        payload: Vec<u8>,
    ) -> Self {
        let checksum = sha256_hex(&payload);
        Envelope {
            header: Header {
                document_id: document_id.into(),
                actor: actor.into(),
                base_revision: base_revision.into(),
                revision: revision.into(),
                kind,
                checksum,
                timestamp: timestamp.into(),
                seq,
                sig: String::new(),
            },
            payload,
        }
    }

    /// Serialize to the NSE1 frame.
    pub fn encode(&self) -> Vec<u8> {
        let header_json = serde_json::to_vec(&self.header).expect("header serializes");
        let mut out = Vec::with_capacity(8 + header_json.len() + self.payload.len());
        out.extend_from_slice(MAGIC);
        out.extend_from_slice(&(header_json.len() as u32).to_be_bytes());
        out.extend_from_slice(&header_json);
        out.extend_from_slice(&self.payload);
        out
    }

    /// Parse an NSE1 frame. Does not verify the checksum — call `verify`.
    pub fn decode(frame: &[u8]) -> Result<Envelope, DecodeError> {
        if frame.len() < 8 {
            return Err(DecodeError::TooShort);
        }
        if &frame[0..4] != MAGIC {
            return Err(DecodeError::BadMagic);
        }
        let hlen = u32::from_be_bytes([frame[4], frame[5], frame[6], frame[7]]) as usize;
        let header_start: usize = 8;
        let header_end = header_start
            .checked_add(hlen)
            .ok_or(DecodeError::BadHeaderLen)?;
        if header_end > frame.len() {
            return Err(DecodeError::BadHeaderLen);
        }
        let header: Header = serde_json::from_slice(&frame[header_start..header_end])
            .map_err(|_| DecodeError::HeaderNotJson)?;
        let payload = frame[header_end..].to_vec();
        Ok(Envelope { header, payload })
    }

    /// Integrity check: the header checksum must equal SHA-256(payload).
    pub fn verify(&self) -> bool {
        sha256_hex(&self.payload) == self.header.checksum
    }

    /// Two envelopes are the "same" sync operation iff they share a revision id.
    /// Used to make queue draining idempotent (docs/sync.md §1).
    pub fn is_duplicate_of(&self, other: &Envelope) -> bool {
        self.header.revision == other.header.revision && !self.header.revision.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Envelope {
        Envelope::new(
            "11111111-1111-4111-8111-111111111111",
            "actor:deadbeef",
            "b3:base",
            "b3:result",
            Kind::YUpdate,
            "2026-09-07T12:00:00Z",
            7,
            b"hello nova".to_vec(),
        )
    }

    #[test]
    fn roundtrip() {
        let e = sample();
        let frame = e.encode();
        assert_eq!(&frame[0..4], MAGIC);
        let d = Envelope::decode(&frame).unwrap();
        assert_eq!(d.header.document_id, e.header.document_id);
        assert_eq!(d.header.seq, 7);
        assert_eq!(d.payload, b"hello nova");
        assert!(d.verify());
    }

    #[test]
    fn tampered_payload_fails_verify() {
        let e = sample();
        let mut frame = e.encode();
        *frame.last_mut().unwrap() ^= 0xff;
        let d = Envelope::decode(&frame).unwrap();
        assert!(!d.verify(), "checksum must catch payload tampering");
    }

    #[test]
    fn tampered_checksum_fails_verify() {
        let mut e = sample();
        e.header.checksum = "0".repeat(64);
        let d = Envelope::decode(&e.encode()).unwrap();
        assert!(!d.verify());
    }

    #[test]
    fn decode_errors() {
        assert_eq!(Envelope::decode(b"xx").unwrap_err(), DecodeError::TooShort);
        assert_eq!(
            Envelope::decode(b"XXXX\0\0\0\0").unwrap_err(),
            DecodeError::BadMagic
        );
        let mut frame = sample().encode();
        frame[4] = 0xff; // absurd header length
        assert_eq!(
            Envelope::decode(&frame).unwrap_err(),
            DecodeError::BadHeaderLen
        );
    }

    #[test]
    fn idempotency_key_is_revision() {
        let a = sample();
        let b = sample();
        assert!(a.is_duplicate_of(&b));
        let mut c = sample();
        c.header.revision = "b3:other".into();
        assert!(!a.is_duplicate_of(&c));
    }

    #[test]
    fn empty_payload_ok() {
        let e = Envelope::new("d", "a", "", "r", Kind::Snapshot, "t", 0, vec![]);
        let d = Envelope::decode(&e.encode()).unwrap();
        assert!(d.verify());
        assert!(d.payload.is_empty());
    }

    #[test]
    fn kind_serializes_lowercase() {
        let e = sample();
        let json = serde_json::to_string(&e.header).unwrap();
        assert!(json.contains("\"kind\":\"yupdate\""));
    }
}
