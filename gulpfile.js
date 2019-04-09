/**
 * Copyright (c) Grab Taxi Holdings PTE LTD (GRAB)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check
const path = require('path');
const gulp = require('gulp');
const { sync } = require('del');
const bundle = require('@lernetz/gulp-typescript-bundle');

const paths = {
  config: ['tsconfig.json'],
  src: ['src/**/*', '!src/*.test.*']
};

const src = 'src/index.ts';
const dest = 'dist';
const demoDest = path.join('demo', 'bridge-server', 'public');

gulp.task('clean:dist', async function() {
  return sync(dest, { force: true });
});

gulp.task(
  'ts:bundle',
  bundle({
    dest,
    src,
    name: 'index',
    rollup: {
      outputOptions: { compact: false, format: 'cjs', sourcemap: false }
    }
  })
);

gulp.task(
  'ts:bundle:umd',
  bundle({
    dest: demoDest,
    src,
    name: 'bridgeSDK',
    rollup: { outputOptions: { format: 'umd', sourcemap: false } }
  })
);

const distSequence = ['clean:dist', 'ts:bundle', 'ts:bundle:umd'];

gulp.task('ts:distribution', gulp.series(...distSequence));

gulp.task('watch:src', function() {
  gulp.watch([...paths.src, ...paths.config], gulp.series('ts:distribution'));
});

gulp.task('watch', gulp.parallel('watch:src'));
gulp.task('default', gulp.parallel('watch', 'ts:distribution'));
