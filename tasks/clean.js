const gulp = require('gulp')
const del = require('del')
const args = require('./lib/args')

gulp.task('clean', () => {
  return del(`dist/${args.vendor}/**/*`)
})
