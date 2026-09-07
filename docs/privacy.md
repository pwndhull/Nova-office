<!-- SPDX-License-Identifier: MPL-2.0 -->
# Privacy

TRD §19. Nova-Office is privacy-first.

## 1. Principles

1. **Offline documents never require cloud connectivity** (TRD §8, §19).
2. **Telemetry is OFF by default** and only ever enabled by an explicit,
   informed opt-in (TRD §19). No dark patterns, no "recommended: on".
3. **Document content never leaves the device** unless the user takes an action
   that inherently sends it (share, sync to a configured provider, invoke a
   remote AI provider they set up). Even then, only what that action needs.
4. **No third-party analytics SDKs.** No ad networks. No fingerprinting.
5. Account is optional. Local use needs no account, no email, no network.

## 2. What is stored where

| Data | Location | Leaves device? |
|------|----------|----------------|
| Documents, Notes, media | local files in the workspace | only via explicit share/sync |
| Workspace metadata, index, versions, comments | local `workspace.novadb` / `.nova/` | only via sync provider if configured |
| Preferences | local config (`registrymodifications.xcu` + `Nova.xcu`) | no |
| Auth tokens | OS keystore | no (used only against the server you chose) |
| Crash reports | local until you opt in to send | only if opted in, content-scrubbed |
| Telemetry events | not collected unless opted in | only if opted in, aggregate/no content |

## 3. Optional telemetry (if the user opts in)

- Scope: app version, OS, feature-usage counts, performance timings, error
  categories. **Never:** document content, file names, paths, titles, workspace
  names, search queries, contacts.
- Transport: batched, TLS, to the endpoint in `product.yaml`
  (`endpoints.telemetry`), rebrandable/self-hostable.
- Fully inspectable: a "view what would be sent" screen; local log of sends.
- Revocable any time; revoking deletes the local queue.

## 4. Network connections Nova may make (all optional / user-initiated)

| Connection | When | Disable |
|-----------|------|---------|
| Update check | if enabled | Settings → Updates |
| Sync provider | if a workspace has one configured | remove provider |
| Collaboration server | when joining a shared doc | don't share |
| AI provider | when you invoke an AI feature with a remote provider set | AI off by default |
| Telemetry | if opted in | Settings → Privacy |
| Crash upload | if opted in, after a crash, with a prompt | Settings → Privacy |

A **"Offline mode" master switch** disables *all* outbound network for the app.

## 5. Data subject rights (hosted/self-hosted server)

- Export: full workspace export (files + metadata) any time, locally.
- Delete: account + server-side data deletion honored; local copy is yours.
- The reference server documents its data retention; self-hosters control it.

## 6. Compliance posture

Designed to make GDPR/CCPA compliance straightforward for deployers: data
minimization by default, local-first, explicit consent, export/delete. Nova the
software collects nothing on its own.

## 7. `SECURITY.md` / `PRIVACY` surfacing

- In-app "Privacy" settings page summarizing this document.
- First-run screen: no pre-checked network options.
