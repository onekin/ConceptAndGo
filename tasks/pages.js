const gulp = require('gulp')
const gulpif = require('gulp-if')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('pages', () => {
  return gulp.src('app/pages/**/*.html')
    .pipe(gulp.dest(`dist/${args.vendor}/pages`))
    .pipe(gulpif(args.watch, livereload()))
})
