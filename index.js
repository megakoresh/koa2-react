const Koa = require('koa');
const CSRF = require('koa-csrf');
const bodyParser = require('koa-body');
const jwt = require('koa-jwt');
const serve = require('koa-static');
const path = require('path');

//Both React and Angular require a module bundler. While Angular supplies
//its own solution, a common middleground like Webpack lets you choose
//more freely between the two. With the koa-webpack middleware we can 
//achieve fast development iteration, because it compiles those files
//to memory and serves them as if they were static files using koa.
//In production before the website is deployed you need to run webpack
//manually using webpack cli command (if globally installed) or
//node ./node_modules/webpack/bin/webpack.js to generate the files to
//disk. Webpack generates one file per type - one .js file for ALL 
//javascript and one .css file for all .scss or LESS files you have
//so you have to follow a single-point-of-entry paradigm which is defacto
//standard for SPAs.

//While you CAN mix SPA and normal templating techniques like this project does
//I do NOT recommend doing so as you'll end up fixing compatibility issues longer
//than developing an actual app. If you feel like you need both, you have to
//design your app such that all SPA-related functionality can be separated and
//bundled separately from the template-related UI. A common way to do this 
//is to have separate projects for your SPA and traditional apps in the same
//git repository. Typical use cases for SPAs are:
//control panels, email clients&organizers, realtime chat/communication apps,
//'progressive web apps' and in general anything that involves lots of management
//and settings tweaks.
//Typical use cases for traditional templae-based apps are
//blogs, news portals, e-commerce, banking systems, company front pages and in
//general anything that involves more reading, less user interaction and
//high levels of security (SPAs don't confirm user state with the server often or at all
//and they store a lot of information clientside, meaning that if an attacker was to
//take a snapshot of the user's activity they could get a lot more info about them
//than from a tradition page that contains only a few settings and a session cookie)

const koaWebpack = require('koa-webpack');
const webpackConfig = require('./webpack.config');

const logger = require('winston');
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug', colorize:true });

const authenticate = require('./middleware/authenticate')();
const responder = require('./middleware/responder');
//const netLogger = require('./middleware/logger');
const config = require('./config');
const routing = require('./middleware/routing')();

const app = new Koa();

app.proxy = true; // this is needed if running from behind a reverse proxy

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
//app.use(netLogger.request());
//app.use(new CSRF(config.csrf));

//your authentication middleware
app.use(authenticate.routes());
app.use(authenticate.allowedMethods());

//jwt token verification for any route containing /api/ segment (unless they are GET routes)
app.use(
  jwt({secret: 'get-tyranasaurus-rekt'})
    .unless({method: 'GET', path: [/^((?!\/api[\/$\s]).)+$/g]})
);
  

//routing - will call your controllers, etc.
app.use(routing.routes());
app.use(routing.allowedMethods());

//if you want to have some middleware running AFTER some controllers (controller will have to call await next)
//remember that after controllers the logic will flow UP the stack so every middleware's code that comes
//after the await next() will run too
app.listen(3000);

logger.info('Application running on port 3000');