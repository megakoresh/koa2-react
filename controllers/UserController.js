const Router = require('koa-router');
const Controller = require('./Controller');

const router = new Router();

class UserController extends Controller {
  static get router(){
    if(router.stack.length>0) return router; //don't bind the routes second time
    router.post('/profile/:id', this.profile);
    router.post('/logout', this.logout);
    return router;
  }

  static async profile(ctx, next){
    //if the authenticate worked, user info should be in ctx.state
  }

  static async logout(ctx, next){

  }
}

exports.controller = UserController;