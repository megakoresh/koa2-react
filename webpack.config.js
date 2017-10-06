const webpack = require('webpack');
const path = require('path');
const config = require('./config');
const babelMinify = require('babel-minify-webpack-plugin');

module.exports = {
  entry: {
    app: [
      //dev server is if you don't have backend 'webpack/hot/dev-server',
      //'webpack-hot-middleware/client',
      path.join(config.appRoot, 'client', 'scripts', 'app.jsx'),
      //more info - https://github.com/webpack-contrib/sass-loader 
      path.join(config.appRoot, 'client', 'styles', 'app.scss')
    ]
  },
  output: {
    path: path.join(config.appRoot, 'client', 'dist'),
    publicPath: '/',
    filename: '[name].js'
  },
  plugins: config.env === 'production'
    ? [
      new webpack
        .optimize
        .DedupePlugin(),
      new webpack
        .optimize
        .UglifyJsPlugin(),
      new babelMinify()
    ]
    : [
      new webpack
        .optimize
        .OccurrenceOrderPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      //new webpack.HotModuleReplacementPlugin(),
    ],
  resolve: {
    extensions: ['.js', '.jsx', '.css', '.scss']
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        query: {
          presets: [
            'es2015', 'react'
          ],
          plugins: []
        },
        include: [path.resolve(config.appRoot, 'client', 'scripts')]
      }, {
        test: /\.scss$/,
        use: [
          {
            loader: "style-loader" // creates style nodes from JS strings
          }, {
            loader: "css-loader" // translates CSS into CommonJS
          }, {
            loader: "sass-loader", // compiles Sass to CSS
            options: {
              // include some other SCSS folders into lookup paths includePaths:
              // [path.join(config.appRoot, 'node_modules', 'foundation', 'scss')]
            }
          }
        ]
      }
    ]
  }
};