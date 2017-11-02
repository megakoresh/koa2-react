const Router = require('koa-router');
const { Utils, Logger } = require('common');

const controllers = Utils.requireNamespace('controllers', 'controller');
/**
 * One interesting idea is to create controller instances for every user session
 * In this case controllers must export a function that takes ctx and next, like middleware,
 * which checks for session/token hash in ctx and if found, either retrieves or creates an
 * instance for it, that is kept between requests. That is, however, against the stateless
 * conventions of SPAs, so not implemented here, though architecture supports it.
 * 
 * If that is done, the the class hierarchy would actually make more sense. Right now
 * it is nothing more than an ogrnizational mechanism.
 */

exports.load = function(router){
  if(!(router instanceof Router)) throw new TypeError('Router must be a koa router');  
  Logger.info(`Loading ${controllers.length} controllers`);
  for (let [name, controller] of Utils.iterateObject(controllers)){  
    controller.routes(router);
  }
  return router;
}