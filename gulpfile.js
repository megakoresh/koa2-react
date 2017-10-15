const gulp = require('gulp');
const browserSync = require('browser-sync');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const path = require('path');
const { Logger, config, webpackConfig } = require('common');
const webpack = require('webpack')(webpackConfig);

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