const Controller = require('./Controller');
const {Authenticator} = require('middleware');

class ApiController extends Controller {
  static async api(ctx, next){
    return ctx.json({ message: 'Pretend that this is an API call eggs dee' });
  }

  static routes(router){
    router.get('/api', Authenticator.login, this.api);
    return router;
  }
}

exports.ApiController = ApiController;