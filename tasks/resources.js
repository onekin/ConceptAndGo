const gulp = require('gulp')
const gulpif = require('gulp-if')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

gulp.task('resources', () => {
  return gulp.src('app/resources/**/**/*')
    .pipe(gulp.dest(`dist/${args.vendor}/resources`))
    .pipe(gulpif(args.watch, livereload()))
})
