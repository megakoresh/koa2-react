const logger = require('winston');
/**
 * Place this at the top of the stack
 */
module.exports.response = function logResponse(options){
  return async function(ctx, next){
    await next();
    logger.verbose(`Response: \n ${ctx.body}`);
  }
}

/**
 * Place this AFTER bodyparser
 */
module.exports.request = function logRequest(options){
  return async function(ctx, next){    
    logger.verbose(`New Request from ${ctx.ip}. Body:`);
    logger.verbose(ctx.body);
    await next();
  }
}