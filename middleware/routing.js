const controllers = require('controllers');
const router = require('koa-router')();
const { Logger } = require('common');

module.exports = function route(options){
  let controllerNames = Object.keys(controllers);
  Logger.debug(`loading ${controllerNames.length} controllers...`);  
  for(let controllerName of controllerNames){
    Logger.debug(`loading ${controllerName}`);
    new controllers[controllerName](router);
    Logger.debug(`${controllerName} loaded successfully`);
  }
  Logger.debug('finished loading controllers...');  

  return router;
}