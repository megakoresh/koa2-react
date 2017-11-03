const Router = require('koa-router');

class Controller {
  constructor(){ 
    throw new Error('Controllers are static in this implementation and can\'t be instantiated'); 
  }

  static index(ctx, next){
    ctx.view('index.pug',{
      list: [
        {
          name: 'Fix database',
          completed: true,
        },
        {
          name: 'Fix models',
          completed: true
        },
        {
          name: 'Fix controllers',
          completed: false
        },
        {
          name: 'Fix clientside',
          completed: false
        }
      ]
    });
  }
  /**
   * Binds the controller's routes to a router
   * @param {Router} router on which to bind routes
   * @param {*} args any other arguments if needed
   * @returns {Router} the router instance after binding all routes
   */
  static routes(router, ...args){
    router.get('/', this.index);
  }
}

module.exports = Controller;