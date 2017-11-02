const Router = require('koa-router');

class Controller {
  /**
   * Binds the controller's routes to a router
   * @param {Router} router on which to bind routes
   * @param {*} args any other arguments if needed
   * @returns {Router} the router instance after binding all routes
   */
  static routes(router, ...args){
    throw new Error('Controller.routes is abstract and must be implementted by subclasses');
  }
}

module.exports = Controller;