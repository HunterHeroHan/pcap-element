import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

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
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      typescript({ 
        tsconfig: './tsconfig.json', 
        declaration: false,
        sourceMap: false
      }),
      scss({
        include: ['src/styles.css'],
        output: 'dist/styles.css',
        outputStyle: 'compressed',
        watch: false,
      }),
      copy({
        targets: [
          { src: 'src/styles.css', dest: 'dist' }
        ]
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
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      typescript({ 
        tsconfig: './tsconfig.json', 
        declaration: false,
        sourceMap: false
      }),
      scss({
        include: ['src/styles.css'],
        output: 'dist/styles.css',
        outputStyle: 'compressed',
        watch: false,
      }),
      copy({
        targets: [
          { src: 'src/styles.css', dest: 'dist' }
        ]
      }),
      terser(),
    ],
    external: [],
  },
]; 