// @ts-check
const gulp = require("gulp");
const bundle = require("@lernetz/gulp-typescript-bundle");

const srcPaths = {
  config: ["tsconfig.json"],
  src: ["src/**/*", "!**/*.test.*"]
};

gulp.task(
  "ts:bundle",
  bundle({
    dest: "dist",
    src: "src/index.ts",
    name: "index",
    rollup: { outputOptions: { sourcemap: false } }
  })
);

const distSequence = ["ts:bundle"];

gulp.task("watch:src", function() {
  gulp.watch(
    [...srcPaths.src, ...srcPaths.config],
    gulp.series(...distSequence)
  );
});

gulp.task("watch", gulp.parallel("watch:src"));
gulp.task("default", gulp.parallel("watch", gulp.series(...distSequence)));
