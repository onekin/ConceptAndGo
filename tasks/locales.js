const gulp = require('gulp')
const gulpif = require('gulp-if')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('locales', () => {
  return gulp.src('app/_locales/**/*.json')
    .pipe(gulp.dest(`dist/${args.vendor}/_locales`))
    .pipe(gulpif(args.watch, livereload()))
})
