const gulp = require("gulp");
const obfuscator = require("gulp-javascript-obfuscator");
const ts = require("gulp-typescript");

const tsProject = ts.createProject("tsconfig.json");

const paths = {
  src: ["src/**/*", "!**/*.test.*"],
  dist: "dist"
};

gulp.task("js:dist", async function() {
  return gulp
    .src(paths.src)
    .pipe(tsProject())
    .pipe(obfuscator())
    .pipe(gulp.dest(paths.dist));
});

gulp.task("watch:js", function() {
  gulp.watch(paths.src, gulp.series("js:dist"));
});

gulp.task("watch", gulp.parallel("watch:js"));
gulp.task("default", gulp.parallel("watch", "js:dist"));
