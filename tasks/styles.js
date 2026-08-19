const gulp = require('gulp')
const gulpif = require('gulp-if')
const log = require('fancy-log')
const colors = require('ansi-colors')
const sourcemaps = require('gulp-sourcemaps')
const less = require('gulp-less')
const sass = require('gulp-dart-sass')
const cleanCSS = require('gulp-clean-css')
const livereload = require('gulp-livereload')
const args = require('./lib/args')

sass.compiler = require('sass')

gulp.task('styles:css', function () {
  return gulp.src('app/styles/*.css')
    .pipe(gulpif(args.sourcemaps, sourcemaps.init()))
    .pipe(gulpif(args.production, cleanCSS()))
    .pipe(gulpif(args.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest(`dist/${args.vendor}/styles`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('styles:less', function () {
  return gulp.src('app/styles/*.less')
    .pipe(gulpif(args.sourcemaps, sourcemaps.init()))
    .pipe(less({ paths: ['./app'] }).on('error', function (error) {
      log(colors.red('Error (' + error.plugin + '): ' + error.message))
      this.emit('end')
    }))
    .pipe(gulpif(args.production, cleanCSS()))
    .pipe(gulpif(args.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest(`dist/${args.vendor}/styles`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('styles:sass', function () {
  return gulp.src('app/styles/*.scss')
    .pipe(gulpif(args.sourcemaps, sourcemaps.init()))
    .pipe(sass().on('error', function (error) {
      log(colors.red('Error (' + error.plugin + '): ' + error.message))
      this.emit('end')
    }))
    .pipe(gulpif(args.production, cleanCSS()))
    .pipe(gulpif(args.sourcemaps, sourcemaps.write()))
    .pipe(gulp.dest(`dist/${args.vendor}/styles`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('styles', gulp.series(
  'styles:css',
  'styles:less',
  'styles:sass'
))
