/*eslint { "global-require": 0 }*/
const path = require('path');
const controllers = {};

require('fs').readdirSync(__dirname).forEach(function (file) {
  /* Ignore base files */
  if (file.match(/(index|^Controller|^ApiController)(\.js)/)) return;
  /* Store module with its name (from filename) */
  controllers[path.basename(file, '.js')] = require(path.join(__dirname, file));
});

module.exports = controllers;