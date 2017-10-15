const logger = require('winston');
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug', colorize:true });
//maintain this order to avoid any circular dependency BS
exports.Logger = logger;
exports.config = require('./config');
exports.Utils = require('./utils');
exports.webpackConfig = require('./webpack.config');