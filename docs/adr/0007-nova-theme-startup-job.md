<!-- SPDX-License-Identifier: MPL-2.0 -->
# ADR-0007: `nova_theme` applies the Nova design tokens via a startup UNO Job

- **Status:** accepted (implementation blocked on the base build being green)
- **Date:** 2026-09-07
- **TRD refs:** §5, §30, §33
- **Verified against:** LibreOffice 25.8 source (`/workspaces/lo-src`, tag `libreoffice-25.8.7.3`)

## Context

The first *visible* piece of the Nova UI is theming — the whole app taking the
Nova design-system colours ([design-system.md](../design-system.md) §2/§7).
We need a way to push the generated token palette
(`nova/design-tokens/dist/NovaTokens.hxx`) into VCL **without forking `vcl` or
`desktop`** (§33).

## Decision

`nova_theme` is a **new gbuild UNO component library** that registers a
**synchronous Job** (`com.sun.star.task.XJob`) on the **`onFirstVisibleTask`**
event. On execute it:

1. reads `/org.openoffice.Nova/Appearance/Theme` via `configmgr`
   (`light|dark|system|hc`),
2. resolves the matching palette from `NovaTokens.hxx` (`nova::tokens::color`),
3. applies it to `Application::GetSettings().GetStyleSettings()` —
   `SetHighlightColor`, `SetActiveColor`, `SetAccentColor`, `SetWindowColor`,
   `SetFaceColor`, `SetDialogColor`, `SetFieldColor`, `SetMenuHighlightColor`,
   focus/selection — then `Application::SetSettings()`,
4. listens for OS appearance changes (system theme) and re-applies.

### Wiring (all verified in source)

| Piece | Where | Mechanism |
|-------|-------|-----------|
| Library | `nova/nova_theme/Library_nova_theme.mk` | `gb_Library_Library`, `gb_Library_use_sdk_api`, `use_libraries(comphelper cppu cppuhelper sal svt tl utl vcl)`, `gb_Library_set_componentfile(nova_theme, nova_theme/util/nova_theme, services)` — auto-collected into `services.rdb` via `postprocess/CustomTarget_components.mk` (`gb_ComponentTarget__ALLCOMPONENTS`), **no postprocess patch** |
| Component | `nova/nova_theme/util/nova_theme.component` | `<implementation constructor="nova_theme_ThemeJob_get_implementation"><service name="org.novaoffice.ThemeJob"/>` |
| Impl | `nova/nova_theme/source/themejob.cxx` | `cppu::WeakImplHelper<css::task::XJob, css::lang::XServiceInfo>` + `extern "C" SAL_DLLPUBLIC_EXPORT ... _get_implementation` |
| Job registration | `nova/nova_config/registry/data/.../Office/Jobs.xcu` overlay | `Jobs/NovaTheme` → `Service = org.novaoffice.ThemeJob`; `Events/onFirstVisibleTask/JobList/NovaTheme` (pattern: `extensions/source/update/check/.../Jobs.xcu`) |
| Module dir into LO tree | `scripts/nova-autogen.sh` | `cp -r nova/nova_theme third_party/libreoffice/nova_theme` (+ copy `dist/NovaTokens.hxx` to `nova_theme/inc/`) |
| Build-graph registration | `patches/0001-*.patch` | add `nova_theme` to `RepositoryModule_host.mk` moduledirs **and** to the `gb_Helper_register_libraries_for_install,OOOLIBS,ooo` list in `Repository.mk` (where `log`, `scn` live) |
| Jobs schema | none — `onlineupdate` uses the same `Events`/`JobList` nodes; `install:module` attr optional | — |

## Alternatives considered

- **Patch `desktop/source/app/app.cxx`** to call the theming code directly —
  rejected: invasive, exactly what §33 forbids, and the Job event fires at the
  right moment anyway.
- **A VCL `NWF` plugin / `SalInstance` hook** — rejected: backend-specific,
  much larger surface.
- **Ship a full VCL "Nova" theme (`--with-theme=nova`)** — that path is for the
  *icon* theme, not the colour palette; revisit for icons later.

## Consequences

- **+** Zero `vcl`/`desktop`/`sfx2` source edits; one small additive module +
  a config overlay + the standing Repository registration patch (which
  `nova_shell` etc. will share).
- **+** Theme switches live (Job re-run / settings listener), no restart.
- **−** `onFirstVisibleTask` fires after the first window is shown, so there may
  be a brief flash of the default palette on cold start. Acceptable for v1;
  can move earlier (a `Desktop` `XEventListener` on `OnStartApp`) if it grates.
- **−** First real gbuild module → the `nova-autogen` dir-copy + `patches/0001`
  need to actually work end to end; shakes out on the first post-green build.

## Status

`NovaTokens.hxx` generation: done. This ADR: the verified plan. `nova_theme`
module + `themejob.cxx`: **written after the base LibreOffice build is green**
(don't add failure surface to the build bring-up).
