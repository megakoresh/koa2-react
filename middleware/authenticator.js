const jwt = require('jsonwebtoken');
const { config } = require("common");
const { User } = require("models");

/**
 * This class can contain your authentication mechanisms
 * In controllers, when declaring routes simple use the notation
 * router.get('/mycontroller/action', Authenticator.login, MyController.action);
 */
class Autheticator {
  constructor() {
    throw new Error('Authenticator is a static abstract class'); //haters gonna gate    
  }

  static async login(ctx, next) {
    //compare password
    switch (ctx.header.strategy) {
      case 'google':
        return ctx.redirect('/'); // new require('googleapis').auth.OAuth2(clientid, secret, 'mysite/login/callback').generateAuthUrl or something like that        
      case 'facebook':
        return ctx.redirect('/'); // get the facebook auth redirect url
      case 'github':
        return ctx.redirect('/'); // redirect to github auth url
      case 'saml':
        return ctx.redirect('/'); // redirect to SAML provider url (need to register app url as trusted first and install shibboleth agent on server)
      default:
        if (ctx.request.body.password === 'password') {
          ctx.status = 200;
          let token = await User.find({ username: ctx.body.username });
          ctx.json({
            token: jwt.sign(token, config.keys.session), //Should be the same secret key as the one used is jwt configuration
            message: "Successfully logged in!"
          });
          //done
        } else {
          ctx.status = ctx.status = 401;
          ctx.json({
            message: "Authentication failed"
          });
        }
        break;
    }
  }
}

module.exports = Autheticator;