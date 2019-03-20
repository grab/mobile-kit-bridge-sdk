const gulp = require("gulp");
const merge2 = require("merge2");
const obfuscator = require("gulp-javascript-obfuscator");
const ts = require("gulp-typescript");
const uglify = require("gulp-uglify");

const tsProject = ts.createProject("tsconfig.json");

const paths = {
  src: ["src/**/*", "!**/*.test.*"],
  dist: "dist"
};

gulp.task("js:dist", async function() {
  const tsStream = gulp.src(paths.src).pipe(tsProject());
  const jsStream = tsStream.js.pipe(uglify().pipe(obfuscator()));
  merge2(jsStream, tsStream.dts).pipe(gulp.dest(paths.dist));
});

gulp.task("watch:js", function() {
  gulp.watch(paths.src, gulp.series("js:dist"));
});

gulp.task("watch", gulp.parallel("watch:js"));
gulp.task("default", gulp.parallel("watch", "js:dist"));
