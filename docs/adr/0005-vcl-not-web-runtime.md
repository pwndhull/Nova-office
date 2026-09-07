<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0005: The Nova shell and editors use VCL, not a web runtime

- **Status:** accepted
- **Date:** 2026-09-07
- **TRD refs:** §21, §22, §32, §45

## Context

Modern-feeling UI is a core goal. The tempting shortcut is Electron/CEF or a
web view per surface. The TRD explicitly forbids "a web page inside a desktop
wrapper" (§22) and "a heavy JavaScript/web runtime into every editing surface"
without strong reason (§32), and forbids fake mockups (§45).

## Decision

All Nova desktop UI is built with **VCL** (LibreOffice's toolkit) using
`weld::`/VCL widgets and `.ui` files, on the native per-platform backends
(gtk3/gtk4/qt, win, osx/quartz, skia). The Nova Notes editor is a **custom VCL
widget** backed by the Nova Notes model, using `editeng` for inline rich text.
Web technology is used **only** for the reference server's browser UI and the
docs site.

## Alternatives considered

- **Electron shell hosting web editors** — rejected: violates §22/§32; two
  document models; memory/startup cost; loses native menu/a11y/IME depth;
  throws away the LibreOffice engine's value.
- **Embed a webview only for Nova Notes** — rejected: still a second runtime and
  a second a11y stack; `editeng` + custom layout gives us native text handling.
- **Qt Quick/QML** — rejected: another toolkit alongside VCL; integration cost
  with `sfx2`/`framework` not justified.

## Consequences

- +: One toolkit, one a11y stack, native behavior (§22–24), no per-surface
  runtime (§32), reuses LibreOffice rendering/typography/IME.
- −: Building a Notion-class block editor in VCL is a large effort
  ([`../risks.md`](../risks.md) R-4); some modern effects are more work than in
  CSS.
- Follow-ups: `nova_shell`, `nova_notes` editor widget; design-token → VCL
  `StyleSettings` bridge (`nova_theme`).
