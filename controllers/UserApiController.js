const Router = require('koa-router');
const ApiController = require('./ApiController');
const { Authenticator } = require('middleware');

const router = new Router();

class UserApiController extends ApiController {
  static async getUserSwag(ctx, next){
    return ctx.json({swag: 'Nope. No swag.'});
  }

  static get router(){
    if(router.stack.length>0) return router; //don't bind the routes second time
    router.get('/api/user/:id/swag', Authenticator.login, this.getUserSwag);
    return router;
  }
}

exports.controller = UserApiController;