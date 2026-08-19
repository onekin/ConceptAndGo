const gulp = require('gulp')
const gulpif = require('gulp-if')
const log = require('fancy-log')
const colors = require('ansi-colors')
const named = require('vinyl-named')
const webpack = require('webpack')
const gulpWebpack = require('webpack-stream')
const plumber = require('gulp-plumber')
const livereload = require('gulp-livereload')
const args = require('./lib/args')
require('regenerator-runtime/runtime')
require('core-js/stable')
const ESLintPlugin = require('eslint-webpack-plugin')

const ENV = args.production ? 'production' : 'development'

gulp.task('scripts', () => {
  return gulp.src(['app/scripts/*.js'])
    .pipe(plumber({
      // Webpack will log the errors
      errorHandler () {}
    }))
    .pipe(named())
    .pipe(gulpWebpack({
      devtool: args.sourcemaps ? 'inline-source-map' : false,
      watch: args.watch,
      output: {
        publicPath: ''
      },
      mode: ENV, // TODO Set to ENV. Currently uglify is not encoding contentScript.js in UTF-8
      resolve: {
        fallback: {
          stream: require.resolve('stream-browserify')
        }
      },
      plugins: [
        new ESLintPlugin(),
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery',
          process: 'process/browser'
        }),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(ENV),
          'process.env.VENDOR': JSON.stringify(args.vendor)
        })
      ],
      module: {
        rules: [{
          test: /\.js$/,
          exclude: /node_modules/,
          use: [{
            loader: 'babel-loader',
            options: {
              cacheCompression: false
            }
          }]/*,
          query: { compact: false } */
        }]
      },
      optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false
      }
    },
    webpack,
    (err, stats) => {
      if (err) return
      log(`Finished '${colors.cyan('scripts')}'`, stats.toString({
        chunks: false,
        colors: true,
        cached: false,
        children: false
      }))
    }))
    .pipe(gulp.dest(`dist/${args.vendor}/scripts`))
    .pipe(gulpif(args.watch, livereload()))
})
