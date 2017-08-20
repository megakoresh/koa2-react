const gulp = require('gulp');
const logger = require('winston');
const webpackConfig = require('./webpack.config');
const browserSync = require('browser-sync');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const webpack = require('webpack')(webpackConfig);
const path = require('path');
const config = require('./config');

gulp.task('dev', function(){
  browserSync({
    server: {
      baseDir: [ path.join(config.appRoot, 'client') ],
      middleware: [
        webpackDevMiddleware(webpack, {
          publicPath: webpackConfig.output.publicPath,
          stats: { colors: true }
        }),
        webpackHotMiddleware(webpack)
      ]
    },
    files: [
      config.appRoot + '/client/dist/css/' + '**/*.css',
      config.appRoot + '/client/dist/' + '**/*.html'
    ]
 });
});