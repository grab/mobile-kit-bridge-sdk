// @ts-check
const path = require('path');
const gulp = require('gulp');
const { sync } = require('del');
const bundle = require('@lernetz/gulp-typescript-bundle');

const srcPaths = {
  config: ['tsconfig.json'],
  src: ['src/**/*', '!src/*.test.*']
};

const dest = 'dist';

gulp.task('clean:dist', async function() {
  return sync(dest, { force: true });
});

gulp.task(
  'ts:bundle',
  bundle({
    dest,
    src: 'src/index.ts',
    name: 'index',
    rollup: {
      outputOptions: { compact: false, format: 'cjs', sourcemap: false }
    }
  })
);

gulp.task(
  'ts:bundle:umd',
  bundle({
    dest,
    src: 'src/index.ts',
    name: 'index.umd',
    rollup: { outputOptions: { format: 'umd', sourcemap: false } }
  })
);

const distSequence = ['clean:dist', 'ts:bundle', 'ts:bundle:umd'];

gulp.task('ts:distribution', gulp.series(...distSequence));

gulp.task('watch:src', function() {
  gulp.watch(
    [...srcPaths.src, ...srcPaths.config],
    gulp.series('ts:distribution')
  );
});

gulp.task('watch', gulp.parallel('watch:src'));
gulp.task('default', gulp.parallel('watch', 'ts:distribution'));
