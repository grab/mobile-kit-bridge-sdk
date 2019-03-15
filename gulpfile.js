const gulp = require("gulp");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const obfuscator = require("gulp-javascript-obfuscator");
const rollup = require("gulp-better-rollup");
const uglify = require("gulp-uglify");

const paths = {
  src: ["src/**/*", "!**/*.test.*"],
  dist: "dist"
};

gulp.task("js:dist", function() {
  return gulp
    .src(paths.src)
    .pipe(rollup({}, "umd"))
    .pipe(babel({ presets: ["@babel/preset-env"] }))
    .pipe(concat("lib.js"))
    .pipe(uglify())
    .pipe(obfuscator())
    .pipe(gulp.dest(paths.dist));
});

gulp.task("watch:js", function() {
  gulp.watch(paths.src, gulp.series("js:dist"));
});

gulp.task("watch", gulp.parallel("watch:js"));
gulp.task("default", gulp.parallel("watch"));
