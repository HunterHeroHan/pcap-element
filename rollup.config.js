import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import terser from '@rollup/plugin-terser';

export default [
  // ESM 构建
  {
    input: 'src/pcap-element-lib.ts',
    output: {
      file: 'dist/pcap-element.esm.min.js',
      format: 'esm',
      sourcemap: false,
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false }),
      scss({
        include: ['src/styles.css'],
        output: 'dist/styles.css',
        outputStyle: 'compressed',
      }),
      terser(),
    ],
    external: [],
  },
  // UMD 构建
  {
    input: 'src/pcap-element-lib.ts',
    output: {
      file: 'dist/pcap-element.umd.min.js',
      format: 'umd',
      name: 'PcapElement',
      sourcemap: false,
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false }),
      scss({
        include: ['src/styles.css'],
        output: 'dist/styles.css',
        outputStyle: 'compressed',
      }),
      terser(),
    ],
    external: [],
  },
]; 