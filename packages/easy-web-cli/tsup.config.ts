import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { bin: 'src/bin.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  platform: 'node',
  noExternal: ['mri'],
  shims: true,
  banner: { js: '#!/usr/bin/env node' },
});
