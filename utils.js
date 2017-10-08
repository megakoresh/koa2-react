/*eslint { "global-require": 0 }*/
const config = require('./config');
const logger = require('winston');
const path = require('path');
const fs = require('fs');

exports = class Utils {
    static getFiles(directory, ignoreRegex){

    }

    static requireFolder(folderPath, ignoreRegex) {
      if (ignoreRegex && !(ignoreRegex instanceof RegExp)) throw new Error(`$Argument ${ignoreRegex} was not a regular expression! Must be a regular expression that matches filenames to be ignored`);

      const modules = {};

      const directory = path.join(config.appRoot, folderPath);

      const files = require('fs').readdirSync(directory)
      if (files.includes('index.js')) {
        if(ignoreRegex && !ignoreRegex.test('index.js'))
          logger.warn(`${directory} includes an index.js file that the passed ignoreRegex ${ignoreRegex} does not match. \nThis means it will be required along with other files. That may not be what you want.`);
        else return require(directory);
      }

      if (!ignoreRegex) ignoreRegex = /(index)(\.js)/;

      const dirStats = fs.statSync(folderPath); //throws if the directory doesnt exist or permission is denied

      if (!dirStats.isDirectory()) throw new Error(`${folderPath} is not a directory!`);

      function* walk(directory) {
        const files = fs.readdirSync(directory);
        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          if (file.match(ignoreRegex)) continue;
          const stat = fs.statSync(path.join(directory, file));
          if (stat.isDirectory()) yield* walk(path.join(directory, file));
          else yield path.join(directory, file);
        }
      }

      const iterator = walk(directory);
      let result = iterator.next();
      while (!result.done) {
        /* Store module with its name (from filename) */
        modules[path.basename(result.value, '.js')] = require(result.value);
        result = iterator.next();
      }
      return modules;
    }

    static requireNamespace(folderPath, namespace) {
      const modules = {};

      const directory = path.join(config.appRoot, folderPath);
      
      const files = require('fs').readdirSync(directory)

      let ignoreRegex = /(index)(\.js)/;

      const dirStats = fs.statSync(folderPath); //throws if the directory doesnt exist or permission is denied

      if (!dirStats.isDirectory()) throw new Error(`${folderPath} is not a directory!`);

      function* walk(directory) {
        const files = fs.readdirSync(directory);
        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          if (file.match(ignoreRegex)) continue;
          const stat = fs.statSync(path.join(directory, file));
          if (stat.isDirectory()) yield* walk(path.join(directory, file));
          else yield path.join(directory, file);
        }
      }

      const iterator = walk(directory);
      let result = iterator.next();
      while (!result.done) {        
        let m = require(result.value);
        if(m[namespace]){
          //store potentially incomplete reference containing the namespace here
          modules[path.basename(result.value, '.js')] = m;
        }
        result = iterator.next();
      }

      //Now bring the namespaced modules to top after all have been required
      //this should resolve circular dependency problems if any
      const moduleNames = Object.keys(modules);
      for(let moduleName of moduleNames){
        modules[moduleName] = modules[moduleName][namespace];
      }
      
      return modules;
    }

    static get DEF_GLOBAL_PROXY_HANDLER(){
      return {
        get(target, name){
          if(name in target) return target[name];
          else throw new ReferenceError(`This global object has no enumerable property "${name}"`);
        }
      }
    }

    static installGlobal(object, name){
      if(Object.keys(global).includes(name)) throw new Error(`A variable by "${name}" already exists at global scope, choose a different name!`);
      //create a proxy to watch changes and prevent pollution
      const proxy = new Proxy(object, Utils.DEF_GLOBAL_PROXY_HANDLER);
      global[name] = proxy;
    }

    static requireModels(){
      let models = Utils.requireNamespace('data', 'model');
      return models;
    }

    static getCurrentClassName(_this){
      return _this.toString().split ('(' || /s+/)[0].split (' ' || /s+/)[1];
    }

    static flatten(array){
      return array.reduce((acc, curr)=>(Array.isArray(curr) ? flatten(curr) : curr));
    }

    static isBasicType(value){
      return Object.keys(value) === 0 || typeof value === 'string';
    }
  }