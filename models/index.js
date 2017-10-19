const { Utils, Logger } = require('common');
const Model = require('./Model');
const models = Utils.requireNamespace('models', 'model');

if(global[Model.MODELS_LOADED_FLAG]){
  Logger.error(`Models are being loaded second time. Please check your code. You only need to require('models') once, after which models will be installed to global scope`);
  module.exports = models;
} else {  
  for (let [name, model] of Utils.iterateObject(models)){  
    if(!global[name] || !(global[name].prototype instanceof Model)){
      Object.defineProperty(global, name, {
        enumerable: true,
        writable: false,
        value: model
      })
    } 
  }
  //mark models as loaded to global scope
  global[Model.MODELS_LOADED_FLAG] = true;
  module.exports = models;
}