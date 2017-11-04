const pug = require('pug');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const { Readable } = require('stream');

const { config, Logger, Utils } = require('common');

class Responder {
  constructor(ctx){    
    this.views = path.join(config.appRoot, 'views');
    //TODO: this is the first thing that sees ctx after new request is made, maybe set some flags? wantsJSON and such?  
    Object.defineProperties(ctx,{
      view: {
        value: this.view.bind(this),
        writable: false,
        configurable: false,
        enumerable: false
      },
      json: {
        value: this.json.bind(this),
        writable: false,
        configurable: false,
        enumerable: false
      },
      raw: {
        value: this.raw.bind(this),
        writable: false,
        configurable: false,
        enumerable: false
      },
      websocket: {
        value: this.websocket.bind(this),
        writable: false,
        configurable: false,
        enumerable: false
      }
    });    
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
    if(stringBufferOrStream instanceof Buffer || stringBufferOrStream instanceof Readable || typeof stringBufferOrStream === 'string')
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
    if(this.data instanceof Buffer || this.data instanceof Readable || typeof this.data === 'string'){
      if(this.data instanceof Readable) ctx.req.pipe(this.data);
      else ctx.body = this.data;
      return;
    }    
    ctx.body = JSON.stringify(this.data);
  }

  static async middleware(ctx, next){    
    const responder = new Responder(ctx);
    try {
      //topmost try-catch block, this will catch ALL errors      
      ctx.responder = responder;

      await next();

      if(responder.viewToRender || responder.data)
        responder.render(ctx);
      //otherwise no methods were called, so we consider the request fully processed already
      //TODO: maybe log something?
    } catch(err){
      Logger.error(`An error occurred processing request: ${err.message}`);
      Logger.error(err.stack);
      responder.view('error.pug', { error: err })
      responder.render(ctx);
    }
  }
}

module.exports = Responder;
