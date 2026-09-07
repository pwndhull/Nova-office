# Nova Office — playground bundle

Version: `@VERSION@` · branch `@REF@` · built `@DATE@`

**What this is:** the Nova Office *design-system explorer* — a static web app that
renders the real `@nova/tokens`, `@nova/motion`, `@nova/icons` and
`@nova/components` packages (Overview, Color, Typography, Space & materials,
Motion, Components, Icons). It is the review surface for the design layer.

**What this is NOT:** the Nova Office desktop application. The office suite is the
downstream LibreOffice fork (Track B) — a separate large native build, not part
of this bundle. See `docs/build.md` in the source repo.

The bundle is plain static files and CPU-architecture independent: the same
archive runs on x86_64 and on aarch64 (Fedora Asahi Remix, Raspberry Pi, …).

---

## Run it

Only Node.js is needed — no compiler, no LibreOffice, nothing to `npm install`.

### Fedora / Fedora Asahi Remix

```bash
sudo dnf install nodejs        # Node 20+; Fedora 40/41 ship 22
tar xzf nova-office-playground-@VERSION@.tar.gz    # or: unzip …zip
cd nova-office-playground
node serve.mjs                 # → http://localhost:4173
node serve.mjs 8080            # choose another port
```

### Debian / Ubuntu

```bash
sudo apt install nodejs
```

### Any OS, any static server

The `dist/` folder is the whole site:

```bash
python3 -m http.server -d dist 4173
npx --yes serve dist
caddy file-server --root dist --listen :4173
```

`serve.mjs` adds `Cache-Control: immutable` on the content-hashed assets and
falls back to `index.html` for client-side routes.

---

## Rebuild from source

```bash
git clone https://github.com/pwndhull/Nova-office && cd Nova-office
git checkout @REF@
npm ci            # resolves the aarch64 esbuild/rollup binaries automatically
npm run build     # tokens pipeline + playground → ui/playground/dist
npm test          # tokens · motion · icons · components · cross-package
npm run playground   # live dev server on http://localhost:5173
```

Run `npm ci` on the target machine (not a copied `node_modules`) so npm picks
the right per-architecture `@esbuild/*` / `@rollup/*` optional packages.
