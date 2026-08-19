const gulp = require('gulp')
const gulpif = require('gulp-if')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('fonts', () => {
  return gulp.src('app/fonts/**/*.{woff,woff2,ttf,eot,svg}')
    .pipe(gulp.dest(`dist/${args.vendor}/fonts`))
    .pipe(gulpif(args.watch, livereload()))
})
