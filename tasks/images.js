const gulp = require('gulp')
const gulpif = require('gulp-if')
const imagemin = require('gulp-imagemin')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe(gulpif(args.production, imagemin()))
    .pipe(gulp.dest(`dist/${args.vendor}/images`))
    .pipe(gulpif(args.watch, livereload()))
})
