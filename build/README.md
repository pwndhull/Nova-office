# build/

Build configuration and packaging metadata that is not code.

| Path | What |
|------|------|
| `autogen/` | LibreOffice `distro-configs/*.conf` presets for the downstream fork (Track B). One `configure` switch per line. |
| `versioning/` | The version scheme, and how the string flows from git tag → package.json → engine product resources. |

The design-layer build (Track A) needs nothing here — see
[`../docs/build.md`](../docs/build.md).
