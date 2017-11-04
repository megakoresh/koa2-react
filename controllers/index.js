const Koa = require('koa');
const { Utils, Logger } = require('common');

const Controller = require('./Controller');
const ApiController = require('./ApiController');
const controllers = Utils.requireNamespace('controllers', 'controller');
/**
 * One interesting idea is to create controller instances for every user session
 * In this case controllers must export a function that takes ctx and next, like middleware,
 * which checks for session/token hash in ctx and if found, either retrieves or creates an
 * instance for it, that is kept between requests. That is, however, against the stateless
 * conventions of SPAs, so not implemented here, though architecture supports it.
 * 
 * If that is done, the the class hierarchy would actually make more sense. Right now
 * it is nothing more than an ogranizational mechanism.
 */

exports.load = function(app){
  if(!(app instanceof Koa)) throw new TypeError('Please provide your app instance so controllers can load their routes');
  
  Logger.info('Loading static routes');  
  app.use(Controller.router.routes());
  app.use(Controller.router.allowedMethods());

  Logger.info('Loading static api routes');  
  app.use(ApiController.router.routes());
  app.use(ApiController.router.allowedMethods());

  for (let [name, controller] of Utils.iterateObject(controllers)){  
    Logger.info(`Loading ${name}`);    
    app.use(controller.router.routes());
    app.use(controller.router.allowedMethods());

  }
  return app;  
}