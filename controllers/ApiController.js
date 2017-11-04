const Router = require('koa-router');
const Controller = require('./Controller');
const { Authenticator } = require('middleware');

const router = new Router();

class ApiController extends Controller {
  static async api(ctx, next){
    return ctx.json({ message: 'Pretend that this is an API call eggs dee' });
  }

  static get router(){
    if(router.stack.length>0) return router; //don't bind the routes second time
    router.get('/api', Authenticator.login, this.api);
    return router;
  }
}

module.exports = ApiController;