import { defineConfig } from 'tsup';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  entry: { halloween: 'src/index.ts' },
  format: ['esm', 'cjs', 'iife'],
  globalName: 'Halloween',
  dts: true,
  clean: true,
  minify: true,
  banner: {
    js: `/*! halloween.js v${pkg.version} | (c) ${pkg.author.name} | MIT License | ${pkg.homepage} */`,
  },
  outDir: 'dist',
  outExtension({ format }) {
    if (format === 'cjs') return { js: '.cjs' };
    if (format === 'iife') return { js: '.iife.js' };
    return { js: '.js' };
  },
});
