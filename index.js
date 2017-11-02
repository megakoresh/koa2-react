const Koa = require('koa');
const CSRF = require('koa-csrf');
const bodyParser = require('koa-body');
const jwt = require('koa-jwt');
const serve = require('koa-static');
const path = require('path');
const koaWebpack = require('koa-webpack');
const Router = require('koa-router');

const models = require('models');
const controllers = require('controllers');
const middleware = require('middleware');
const common = require('common');

const { config, Logger, Utils, webpackConfig } = common;
const { responder } = middleware;

const app = new Koa();
const router = new Router();
//app.proxy = true; //this is needed if running from behind a reverse proxy

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

controllers.load(router);
app.use(router);

app.listen(3000);

Logger.info('Application running on port 3000');