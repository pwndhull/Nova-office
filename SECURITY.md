<!-- SPDX-License-Identifier: MPL-2.0 -->
# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Email: `security@example.org` *(placeholder — set the real address in
`product/product.yaml` handling before first release; see `TASKS.md`)*.
PGP key: **TODO** (publish before first binary release).

Please include: affected component/version, reproduction steps, impact, and any
proposed fix. We aim to acknowledge within 3 business days and to agree a
disclosure timeline (default 90 days).

## Scope

- The Nova Experience Layer (`nova/`), the reference server (`nova-server/`),
  build/generator scripts, and the `.nova` file format parser.
- LibreOffice core vulnerabilities: report upstream to
  `security@documentfoundation.org`; also tell us if Nova is affected.

## Practices

See [`docs/security.md`](docs/security.md) — reused crypto only, memory-safe
Rust for parsing-heavy paths, capability-scoped plugins, off-by-default
telemetry, SBOM + dependency scanning, signed releases. A security review
(`/security-review`) gates every release.

## Supported versions

Pre-1.0: only `main`. Post-1.0: the current and previous minor.
