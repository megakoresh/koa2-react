const jwt = require('jsonwebtoken');
const authRoutes = require('koa-router')();
const { config } = require("common");
const { User } = require("models");

/**
const passport = require('koa-passport');
If passport is used something like this should be passed as app middleware
app.use(passport.initialize())
app.use(passport.session())
passport configuration options should be read from 
https://github.com/rkusa/koa-passport
https://github.com/jaredhanson/passport

Example of passport and jwt together: https://github.com/f0rr0/koa-passport-jwt 

If you use a wrapper like this one, you can return a koa-compose object that combines
all the passport stuff together. compose(passport.initialize(), passport.jwt(), passport.somethingElse())
*/

async function login(ctx, next){
  //compare password
  switch(ctx.header.strategy){
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

  //another option is to ctx.redirect to some page imediately, which would
  //eliminate the need to responde to the token. But you will need to set
  //the cookie header correctly: ctx.cookies.set('auth_token', token, {signed: true, maxAge: 1000*60*60*6, secure: true}))
  //and make sure that the jwt middleware checks the cookie too if the Authorization header is missing.
  //Alternatively if you are using React or Angular you can attach a sort of 'middleware' that will
  //automatically append the header for every request anyway.
  return ctx;
}

/**
 * Returns a router instance that contains a /login route
 * @returns {KoaRouter} a koa-router instance configured with the login route
 */
module.exports = function authenticate(){

  //authRoutes.post('/login/callback', loginWithRemoteService); //return the token with information received from remote login provider
  authRoutes.post('/login', login);

  return authRoutes;
}