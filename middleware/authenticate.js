const jwt = require('jsonwebtoken');
const authRoutes = require('koa-router')();
const config = require('../config');

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

The takeaway here is that regardless of what you use one of these things will happen
1) Sign the token and return it to client OR attach it to ctx and continue with it
OR
1) Redirect the client to remote login provider
2) Receive user info from remote provier at /login/callback
3) Sign the token and return it to the client OR attach it to ctx and continue with it

So whatever happens you will still end up with a signed token, that you can either return to client
immediately, then client will query something else with OR if the client wanted to do else with the app
you can attach the token to ctx as if the client already did that and await next() to continue the 
processing with the client 'logged in'. This is what happens when you press "Post reply" somewhere, 
it says your session is expired, you login again and instead of taking you to homepage it returns you
to where you were (i.e. posts the reply). Remote providers like google often support an "echo" option that will
return you along with the userdata whatever you sent them. So if you send the user's post data to them, they
will echo it back, and you can use it to continue doing what the user intended before they got interrupted
by the login prompt.
 */

async function login(ctx, next){
  //compare password
  if (ctx.request.body.password === 'password') {
    ctx.status = 200;      

    switch(ctx.header.strategy){
      case 'google':
        return ctx.redirect('/'); // new require('googleapis').auth.OAuth2(clientid, secret, 'mysite/login/callback').generateAuthUrl or something like that        
      case 'facebook':
        return ctx.redirect('/'); // get the facebook auth redirect url
      case 'github':
        return ctx.redirect('/'); // redirect to github auth url
      case 'metropolia':
       //if you are using passport, you need to utilize the available SAML strategy to login with Finnish (and most EU) universities accounts.
       //general steps are the same though, its just that the callback and whatnot passport does for you, but you still need to get the service url
       //somewhere and register your service as trusted with the university's IT department
       return ctx.redirect('/'); // redirect to Metropolia SAML provider url (need to register app as trusted with IT services first)
    }

    
    let token = { username: 'XxX_4ssD3str0y3r_XxX', role: 'Noscoper' }; //await User.matchUser(ctx.body.username, ctx.body.password);
    
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

  //another option is to ctx.redirect to some page imediately, which would
  //eliminate the need to responde to the token. But you will need to set
  //the cookie header correctly: ctx.cookies.set('auth_token', token, {signed: true, maxAge: 1000*60*60*6, secure: true}))
  //and make sure that the jwt middleware checks the cookie too if the Authorization header is missing.
  //Alternatively if you are using React or Angular you can attach a sort of 'middleware' that will
  //automatically append the header for every request anyway.
  return ctx;
}

 /**
  * Returns router middleware configured with the appropriate authentication
  * logic. Note that this is only for stateless authentication. If you want to
  * implement sessions, you need to do this logic here and call await next() 
  * appropriately after the user session has been created a verified. For
  * stateless authentication, this one just returns a JWT token, and 
  * breaks the middleware stack (i.e. returns a response)
  * @Example
  ```javascript
  ...
  app.use(csrf());
  const authenticate = require('./middleware/authenticate')();
  app.use(authenticate.routes());
  app.use(authenticate.allowedMethods());
  app.use(jwt(options))
  ```
  * @return {koa-router} pre-configured router for authentication to be placed BEFORE JWT or session middleware
  */
module.exports = function authenticate(){

  //authRoutes.post('/login/callback', loginWithRemoteService); //return the token with information received from remote login provider
  authRoutes.post('/login', login);

  return authRoutes;
}