import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { minify } from 'rollup-plugin-esbuild-minify';
import scss from 'rollup-plugin-scss';

export default {
  input: 'src/pcap-element-lib.ts',
  output: {
    file: 'dist/pcap-element.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
    scss({
      include: ['src/styles.css'],
      output: 'dist/bundle.css',
      outputStyle: 'compressed',
    }),
    minify()
  ],
  external: [],
}; 