const { Utils } = require('common');
const classes = Utils.requireNamespace('models', 'model');
const loaders = Utils.requireNamespace('models', 'load');

for(let name of Object.keys(classes)){  
  if(!loaders.hasOwnProperty(name)) throw new Error(`Model loader missing for ${name}, please export .model and .load properties from model to inject other models without using cyclic dependencies.`);
  exports[name] = loaders[name](classes);
}