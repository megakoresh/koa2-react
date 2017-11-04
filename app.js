const Koa = require('koa');
const CSRF = require('koa-csrf');
const bodyParser = require('koa-body');
const jwt = require('koa-jwt');
const serve = require('koa-static');
const path = require('path');
const webpack = require('koa-webpack');
const Router = require('koa-router');

const models = require('models');
const controllers = require('controllers');
const middleware = require('middleware');
const common = require('common');

const { config, Logger, Utils, webpackConfig } = common;
const { Responder } = middleware;

const app = new Koa();
//app.proxy = true; //this is needed if running from behind a reverse proxy

//more info https://github.com/shellscape/koa-webpack
if(config.env !== 'production'){
  app.use(webpack({ config: webpackConfig }));
  if(!process.env['NO_STATIC'])
    app.use(serve(path.join(config.appRoot, 'client', 'dist')));  
}

app.use(Responder.middleware);
//note: by default multipart requests are not parsed. More info: https://github.com/dlau/koa-body 
app.use(bodyParser());
app.use(new CSRF(config.csrf));

controllers.load(app);

app.listen(3000);

Logger.info('Application running on port 3000');