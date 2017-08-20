const Controller = require('./Controller');

class UserController extends Controller {
  constructor(router){
    super(router);
    router.post('/profile/:user', this.profile);
    router.post('/logout', this.logout);
  }

  profile(ctx, next){
    //if the authenticate worked, user info should be in ctx.state
  }

  logout(ctx, next){

  }
}

module.exports = UserController;