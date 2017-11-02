const Controller = require('./Controller');

class UserController extends Controller {
  static routes(router){
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