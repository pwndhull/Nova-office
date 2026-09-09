<!-- SPDX-License-Identifier: MPL-2.0 -->
# Nova shell — implementation plan

- **Date:** 2026-09-09
- **Governed by:** [ADR-0005](adr/0005-vcl-not-web-runtime.md) (VCL, not a web
  runtime), [ADR-0007](adr/0007-nova-theme-startup-job.md) (tokens → VCL)
- **TRD refs:** §4 (design philosophy), §5 (design system), §6 (shell), §7
  (command palette), §22, §32, §45
- **Risk:** [R-4](risks.md) — a Notion-class block editor in VCL is a large
  product on its own
- **Unblocks:** `TASKS.md` 1.6 "Application shell (VCL-level) — NOT IMPLEMENTED
  — requires LO build environment"

---

## 0. What changed

`TASKS.md` 1.6 has been blocked on *"requires LO build environment"* since it
was written. **That blocker is gone.** As of 2026-09-08/09 both native builds
are green and produce a running app:

| Target | Artifact | State |
|--------|----------|-------|
| Linux aarch64 | `nova-office-linux-aarch64` (249 MB) | runs |
| macOS arm64 | `nova-office-macos-arm64` (`.app`) | runs — verified on Apple Silicon |

So shell work can now be compiled and seen. That is the prerequisite this plan
depends on and it is satisfied.

---

## 1. The prototype is a specification, not an implementation

There is an interactive HTML prototype of the §6 shell. Its status under **TRD
§45** must be unambiguous:

> **NOT IMPLEMENTED.** The HTML/CSS/JS shell prototype is a *visual and
> interaction specification*. It is not Nova-Office, it is not shipped, and no
> part of it is loaded by the application. §45 forbids "static mockups" and
> "placeholder implementations while claiming completion" — the prototype is
> allowed only as a design reference, and only while carrying this marking.

It exists to answer "what should the VCL widgets look and behave like", the same
role a Figma file would play. **Shipping it inside a webview would violate
ADR-0005 and TRD §22/§32.** If that trade is ever to be revisited, it takes a
superseding ADR, not a pull request.

---

## 2. Prototype → VCL mapping

Each element of the §6 shell, and the concrete LibreOffice machinery that
implements it. Everything below lives in `nova/` modules copied into the LO tree
by `scripts/nova-autogen.sh`; the standing rule from `patches/README.md` is that
`patches/` stays tiny.

| §6 element | VCL implementation | New or existing |
|---|---|---|
| Token palette → every control | `nova_theme` UNO Job → `StyleSettings` | designed (ADR-0007), not built |
| Band 1 — brand, menubar, document tabs | `nova_shell` window owning an `SfxViewFrame` stack; native menu stays `framework`'s (§22 wants real macOS menus) | new |
| Band 2 — contextual toolbar | `framework` toolbar controllers, context-sensitive; a Nova `.ui` layout, one row, not two | existing machinery, new layout |
| Band 3 left — nested pages / outline / comments | `sfx2::sidebar` deck on the **left**, driven by a `NovaDeck` controller that owns responsive collapse and section order | existing deck + new controller (tech-debt #8) |
| Band 3 right — document canvas | unchanged `SwEditWin` / `ScGridWindow` / `sd::Window` | existing — **do not touch** |
| Band 4 — status, sync, presence | `SfxStatusBar` items + Nova status controllers | existing machinery |
| ⌘K command palette (§7) | new `weld::Dialog` over an index of `.uno:` commands from `framework`'s command tables, ranked by the existing `fuzzy` ranker's algorithm | new |
| `/` slash menu + blocks | part of the `nova_notes` editor widget — **not** retrofitted onto Writer | new (R-4) |
| Serif document face, page measure | `nova_theme` default paragraph style + page setup defaults | config |

### What the screenshot tells us to remove

The current running app shows stock LibreOffice chrome. Concretely, the shell
work is: two icon toolbar rows → one contextual toolbar; right sidebar deck →
left nested-page deck; "Default Paragraph Style" dropdown → block/style
selector; Liberation Serif 12pt → the Nova document face.

---

## 3. Phasing

Ordered so each phase produces something visible in the running app. R-4's
mitigation ("phase it") is the spine.

### Phase A — the app stops looking like LibreOffice *(smallest visible win)*
1. Build `nova_theme` per ADR-0007; verify tokens reach `StyleSettings` on
   macOS/quartz and gtk3.
2. Nova default document style + page setup (serif face, measure).
3. Collapse the two toolbar rows to one Nova `.ui` layout.

Exit: a screenshot that is recognisably Nova, no new widgets. **Verify with a
before/after screenshot in the PR.**

### Phase B — the shell frame
4. `nova_shell` module: window, band layout, document tabs over `SfxViewFrame`.
5. Move the sidebar deck to the left; `NovaDeck` controller for collapse.
6. Status bar: sync / presence / offline items (real state or explicitly `TODO`
   — §45 forbids fake sync indicators).

Exit: §6's four bands, live.

### Phase C — command palette (§7)
7. Command index over `.uno:` commands + documents + headings.
8. `weld::Dialog` palette, ⌘K, keyboard-first, a11y from day one.

Exit: ⌘K works in the real app.

### Phase D — Nova Notes block editor (R-4, the large one)
9. Custom VCL widget + `editeng` inline rich text; block model in
   `nova_notes/`.
10. Blocks in R-4's order: text/heading/list/todo/quote/callout/code/image
    **first**; tables/databases/board views later.
11. Slash menu, then nested pages, then backlinks.

Exit: Notes is a real editor. This phase is a product, not a task.

### Not in this plan
Live ranges in prose, properties/databases, board views. They follow the block
model and should not be scheduled until Phase D lands.

---

## 4. Accessibility and platform behaviour

Non-negotiable per §22–24 and R-4's mitigation ("a11y from day one so it isn't a
rewrite"):

- Every new widget implements the VCL a11y interfaces; verify with VoiceOver
  (macOS) and Orca (gtk3).
- Native macOS menu, real keyboard shortcuts, system appearance/dark mode,
  full-screen, document icons, file dialogs, drag-and-drop, IME.
- These are exactly what a webview would have cost us, and the reason ADR-0005
  went the way it did.

---

## 5. Estimates and honesty about them

| Phase | Scope | Rough |
|---|---|---|
| A | theming + type + one toolbar | 2–3 weeks |
| B | shell frame, tabs, left deck, status | 6–10 weeks |
| C | command palette | 3–4 weeks |
| D | Notes block editor to R-4's first tier | 4–6 months |

These assume a developer who can already build the tree — which, as of §0, is
now possible. They are estimates, not commitments, and D in particular is a
product-sized bet the ADR already acknowledged.

---

## 6. Open decision for the owner

ADR-0005 accepted a known cost: *"Building a Notion-class block editor in VCL is
a large effort."* Phase D is that cost, and §5 sizes it at 4–6 months.

If that is unacceptable, the honest alternatives are:
1. **Narrow the ambition** — Nova ships an excellent *office suite* shell
   (Phases A–C) and Notes stays a later product. Cheapest, keeps every §22/§32
   guarantee.
2. **Revisit ADR-0005 for Notes only** — a webview for the Notes surface alone.
   ADR-0005 already considered and rejected this ("still a second runtime and a
   second a11y stack"); overturning it needs a superseding ADR that argues the
   a11y and §22 costs are acceptable *for that one surface*.

Recommendation: **option 1.** Phases A–C deliver the redesign people actually
see, on the engine's strengths, without a second runtime. Revisit Notes once
the shell is real.
