const gulp = require('gulp')
const log = require('fancy-log')
const colors = require('ansi-colors')
const zip = require('gulp-zip')
const packageDetails = require('../package.json')
const args = require('./lib/args')

function getPackFileType () {
  switch (args.vendor) {
    case 'firefox':
      return '.xpi'
    default:
      return '.zip'
  }
}

gulp.task('pack', gulp.series('build', () => {
  let name = packageDetails.name
  let version = packageDetails.version
  let filetype = getPackFileType()
  let filename = `${name}-${version}-${args.vendor}${filetype}`
  return gulp.src(`dist/${args.vendor}/**/*`)
    .pipe(zip(filename))
    .pipe(gulp.dest('./packages'))
    .on('end', () => {
      let distStyled = colors.magenta(`dist/${args.vendor}`)
      let filenameStyled = colors.magenta(`./packages/${filename}`)
      log(`Packed ${distStyled} to ${filenameStyled}`)
    })
}))
