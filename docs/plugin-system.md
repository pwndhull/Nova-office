<!-- SPDX-License-Identifier: MPL-2.0 -->
# Plugin System

TRD §36. Preserve and improve extensibility; consider security **before**
allowing plugins to run arbitrary code.

## 1. Two tiers

| Tier | What | Trust |
|------|------|-------|
| **Legacy `.oxt`** | Existing LibreOffice extensions (UNO components, Basic, add-ons) | In-process, full rights — **kept for compatibility**, shown with a clear "unsandboxed" badge; disabled by default in a future hardened mode |
| **Nova plugins (`.novaplugin`)** | New capability-scoped plugins | Declared capabilities only; host-mediated APIs |

## 2. Nova plugin package

```
myplugin.novaplugin  (zip)
 ├─ manifest.json      id, name, version, author, license, entry, capabilities, api-version
 ├─ code/              JS (QuickJS host) | WASM (wasmtime) | native lib (signed, review)
 ├─ ui/                contributed panels/commands (declarative)
 └─ assets/
```

`manifest.json` capabilities (deny-by-default):
```
"capabilities": {
  "commands": ["nova.export.*"],           // register palette commands
  "documents": { "read": true, "write": false, "kinds": ["writer","notes"] },
  "workspace": { "read": ["metadata"] },
  "network": { "hosts": ["api.example.com"] },   // explicit allowlist, user-approved
  "fs": { "pick": true },                        // user-picked files only, no ambient FS
  "ui": ["sidebar-panel", "palette-command", "export-target"],
  "ai": false, "collab-provider": false
}
```

## 3. Execution model

- **JS/WASM plugins run out-of-process** (a `nova-plugin-host` child) with a
  restricted syscall surface (seccomp/AppContainer/sandbox-exec). Communication
  = a typed JSON-RPC bridge to host APIs.
- Native plugins require code-signing + manual review + an explicit user
  "I trust this" with the publisher shown.
- Network only to manifest-declared hosts, proxied by the host (logged).
- File access only through host-mediated pickers (no path enumeration).
- CPU/memory/time quotas; a hung plugin can't freeze the UI.

## 4. Plugin categories (TRD §36)

document tools · themes · exporters · importers · AI providers · collaboration
providers · cloud/sync providers · productivity tools.

Each maps to a host extension point:
| Category | Extension point |
|----------|-----------------|
| exporter/importer | `INovaExporter` / filter registration |
| theme | design-token overlay + icon set |
| AI provider | `nova_ai::Provider` impl (out-of-process) |
| collab/cloud provider | `DocSyncProvider` / `AuthProvider` impl |
| document tool | palette command + sidebar panel + document API |

## 5. Distribution

- Local install from file; optional signed registry (rebrandable URL in
  `product.yaml`).
- Per-user and per-workspace scopes.
- Update channel with signature verification.

## 6. Status

**NOT IMPLEMENTED** (Phase after v1). This document is the design contract;
`nova_plugin/` module is scaffolded but empty. Legacy `.oxt` continues to work
via upstream `desktop/deployment` in the meantime.
