const Router = require('koa-router');

const router = new Router();

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
          completed: true
        },
        {
          name: 'Fix clientside',
          completed: true
        }
      ]
    });
  }
  /**
   * Binds the controller's routes to a router and returns it
   * @returns {Router} the router instance with this controller's routes bound
   */
  static get router(){
    if(router.stack.length>0) return router; //don't bind the routes second time
    router.get('index', '/', Controller.index);
    return router;
  }
}

module.exports = Controller;