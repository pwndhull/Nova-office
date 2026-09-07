#!/usr/bin/env node
/**
 * Zero-dependency static server for the Nova Office playground bundle.
 *
 *   node serve.mjs [port]        # default 4173
 *
 * Serves ./dist, falls back to index.html for client routes, sets long-cache
 * headers on hashed assets. Nothing to npm-install.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(ROOT, path);

    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info) {
      // SPA fallback.
      file = join(ROOT, 'index.html');
    }

    const body = await readFile(file);
    const ext = extname(file);
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    if (file.includes(`${join(ROOT, 'assets')}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.end(body);
  } catch (err) {
    res.statusCode = 500;
    res.end(`500 ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Nova Office playground → http://localhost:${PORT}`);
});
