import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * The @nova/* packages ship TypeScript source, not a build. Aliasing them to
 * their source directories (rather than letting Vite resolve the npm-workspace
 * symlinks) keeps them inside the compile graph, so editing a component
 * hot-reloads here instead of requiring a rebuild of the dependency.
 */
const pkg = (name: string) => fileURLToPath(new URL(`../${name}/src`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Longest-prefix first: Vite matches aliases in order, so the bare
      // package name must not shadow its subpath exports.
      '@nova/components/css': fileURLToPath(
        new URL('../components/src/styles.css', import.meta.url),
      ),
      '@nova/components': pkg('components'),
      '@nova/icons': pkg('icons'),
      '@nova/motion': pkg('motion'),
      // tokens has no src barrel — it is generated.
      '@nova/tokens/css': fileURLToPath(new URL('../tokens/dist/nova-tokens.css', import.meta.url)),
      '@nova/tokens': fileURLToPath(new URL('../tokens/dist/tokens.ts', import.meta.url)),
    },
  },
  // Pre-bundling would snapshot the workspace sources and defeat the aliases.
  optimizeDeps: { exclude: ['@nova/components', '@nova/icons', '@nova/motion', '@nova/tokens'] },
  server: { port: 5173, host: true },
});
