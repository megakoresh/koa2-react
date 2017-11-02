const ApiController = require('./ApiController');
const { Authenticator } = require('middleware');

class UserApiController extends ApiController {
  static async getUserSwag(ctx, next){
    return ctx.json({swag: 'Nope. No swag.'});
  }

  static routes(router){
    router.get('/api/user/:id/swag', Authenticator.login, this.getUserSwag);
    return router;
  }
}

exports.UserApiController = UserApiController;