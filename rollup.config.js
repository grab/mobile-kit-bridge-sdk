import commonJs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import sourceMap from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

function createConfig({ file = 'dist/index.js' }) {
  return {
    input: 'src/index.ts',
    output: {
      format: 'umd',
      file,
      name: 'bridgeSDK',
      sourcemap: false
    },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            target: 'es5',
            module: 'es2015'
          }
        }
      }),
      commonJs(),
      resolve(),
      sourceMap(),
      uglify()
    ]
  };
}

export default [
  createConfig({}),
  createConfig({ file: 'demo/bridge-server/public/index.js' })
];
