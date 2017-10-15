const Koa = require('koa');
const CSRF = require('koa-csrf');
const bodyParser = require('koa-body');
const jwt = require('koa-jwt');
const serve = require('koa-static');
const path = require('path');
const koaWebpack = require('koa-webpack');

//try to link local deps as part of app startup sequence
try {
  /* eslint global-require: 0 */
  const linklocal = require('linklocal');
  let done = false;
  linklocal.recursive(__dirname, ()=>{ 
    done = true 
  });
  console.info('linking local depenencies (models, commons and middleware)');
  /* eslint no-empty: 0 */
  while(!done){} //block process until linking is finished
  setTimeout(()=>{ 
    console.error('linklocal timeout'); 
    done=true;
  }, 7000); //don't block forever though
} catch (err) {
  console.warn("linklocal peer dependency is not installed. It is needed to symlink models and common code so you don't have to run npm install every time you make a change to them.");
}

const { config, Logger, Utils, webpackConfig } = require('common');
const { responder, authenticate, routing } = require('middleware');

const app = new Koa();
app.proxy = true; //TODO: this is needed if running from behind a reverse proxy

//log response before sending out
//app.use(netLogger.response());

//more info https://github.com/shellscape/koa-webpack
if(config.env !== 'production'){
  app.use(koaWebpack(webpackConfig));
}

//serve static files - disable when running in production and/or from under a proxy
//app.use(serve(path.join(config.appRoot, 'client', 'dist')));

// top level handler (for errors and response rendering) also adds the helper
// method ctx.json() and ctx.view() and ctx.log as well as renders the final response
app.use(responder({appRoot: config.appRoot, app: app}));
//note: by default multipart requests are not parsed. More info: https://github.com/dlau/koa-body 
app.use(bodyParser());
//CSRF disabled for now
//app.use(new CSRF(config.csrf));

//your authentication routes
app.use(authenticate.routes());
app.use(authenticate.allowedMethods());  

//routing - will call your controllers, etc.
app.use(routing.routes());
app.use(routing.allowedMethods());

//if you want to have some middleware running AFTER some controllers (controller will have to call await next)
//remember that after controllers the logic will flow UP the stack so every middleware's code that comes
//after the await next() will run too
app.listen(3000);

Logger.info('Application running on port 3000');