const gulp = require('gulp')
const gulpif = require('gulp-if')
const log = require('fancy-log')
const colors = require('ansi-colors')
const livereload = require('gulp-livereload')
const jsonTransform = require('gulp-json-transform')
const plumber = require('gulp-plumber')
const applyBrowserPrefixesFor = require('./lib/applyBrowserPrefixesFor')
const args = require('./lib/args')

let manifest = () => {
  return gulp.src('app/manifest.json')
    .pipe(plumber({
      errorHandler: error => {
        if (error) {
          log('manifest:', colors.red('Invalid manifest.json'))
        }
      }
    }))
    .pipe(
      jsonTransform(
        applyBrowserPrefixesFor(args.vendor),
        2 /* whitespace */
      )
    )
    .pipe(gulp.dest(`dist/${args.vendor}`))
    .pipe(gulpif(args.watch, livereload()))
}

gulp.task('manifest', () => {
  return gulp.src('app/manifest.json')
    .pipe(plumber({
      errorHandler: error => {
        if (error) {
          log('manifest:', colors.red('Invalid manifest.json'))
        }
      }
    }))
    .pipe(
      jsonTransform(
        applyBrowserPrefixesFor(args.vendor),
        2 /* whitespace */
      )
    )
    .pipe(gulp.dest(`dist/${args.vendor}`))
    .pipe(gulpif(args.watch, livereload()))
})

exports.manifest = manifest
