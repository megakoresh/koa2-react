const pug = require('pug');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const { config, Logger, Utils } = require('common');

class Responder {
  constructor(app, appRoot){
    this.app = app;
    if(!appRoot) appRoot = config.appRoot;
    this.views = path.join(appRoot, 'views');
    app.context.view = this.view.bind(this);
    app.context.json = this.json.bind(this);
    app.context.raw = this.raw.bind(this);
    app.context.websocket = this.websocket.bind(this);
  }

  get pugOptions(){
    const options = {
      Utils //expose util functions to the templates      
    }
    if(this.viewToRender && config.env === 'production') options.cache = true;
    if(options.cache) options.filename = path.basename(this.viewToRender);
    return options;
  }

  get ejsOptions(){
    const options = {
      locals: {
        Utils //expose util functions to the templates      
      },
      _with: false
    }
    if(this.viewToRender && config.env === 'production') options.cache = true;
    if(options.cache) options.filename = path.basename(this.viewToRender);
    return options;
  }

  view(view, data){
    if(view.includes('/views'))
      this.viewToRender = path.relative(this.views, view);
    else
      this.viewToRender = view;
    this.data = data;
  }

  json(data){
    this.data = data;
  }

  raw(stringBufferOrStream){
    if(stringBufferOrStream instanceof Buffer || stringBufferOrStream instanceof ReadableStream || typeof stringBufferOrStream === 'string')
      this.data = stringBufferOrStream;
    else Logger.error('Can not send raw response - not a buffer, string or readabale stream');
  }

  websocket(){
    throw new Error('Not implemented');
  }

  render(ctx){
    if(!this.data) this.data = {};
    if(ctx.csrf) this.data.csrf = ctx.csrf;
    if(this.viewToRender){
      const ext = path.extname(this.viewToRender);
      const view = path.join(this.views, this.viewToRender);      
      switch(ext){
        case '.pug':
        ctx.body = pug.renderFile(view, Object.assign({},this.data,this.pugOptions))
        break;
        case '.ejs':
        ctx.body = ejs.render(view, this.data, this.ejsOptions);
        break;
        case '.html':
        Logger.warn(`Outputting raw HTML file, ${view}, please consider serving static files using a separate server`);
        ctx.body = fs.readFileSync(view, 'utf8');
        break;
      }
      return;
    }
    if(this.data instanceof Buffer || this.data instanceof ReadableStream || typeof this.data === 'string'){
      if(this.data instanceof ReadableStream) ctx.req.pipe(this.data);
      else ctx.body = this.data;
      return;
    }
    if(!ctx.state.wantsJSON) Logger.warn('ctx.state.wantsJSON not set, but looks like I have to render a JSON anyway. Consider detecting and setting this flag to be sure.');
    ctx.body = JSON.parse(this.data);    
  }

  async middleware(ctx, next){
    try {
      //topmost try-catch block, this will catch ALL errors
      ctx.renderer = this;
      await next();
      if(this.viewToRender || this.data)
        this.render(ctx);
      //otherwise no methods were called, so we consider the request fully processed already
      //TODO: maybe log something?
    } catch(err){
      Logger.error(`An error occurred processing request: ${err.message}`);
      Logger.error(err.stack);
      this.view('error.pug', { error: err })
      this.render(ctx);
    }
  }
}

module.exports = Responder;
