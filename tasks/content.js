const gulp = require('gulp')
const gulpif = require('gulp-if')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('content', () => {
  return gulp.src('app/content/**/*.*')
    .pipe(gulp.dest(`dist/${args.vendor}/content`))
    .pipe(gulpif(args.watch, livereload()))
})
