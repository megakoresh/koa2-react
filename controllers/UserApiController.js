const ApiController = require('./ApiController');

class UserApiController extends ApiController {
  constructor(router){
    super(router);
  }
}

module.exports = UserApiController;