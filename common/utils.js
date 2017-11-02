/*eslint { "global-require": 0 }*/
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { Logger } = require('common');

class Utils {
  static getFiles(directory, ignoreRegex) {

  }

  static requireFolder(folderPath, ignoreRegex) {
    if (ignoreRegex && !(ignoreRegex instanceof RegExp)) throw new Error(`$Argument ${ignoreRegex} was not a regular expression! Must be a regular expression that matches filenames to be ignored`);

    const modules = {};

    const directory = path.join(config.appRoot, folderPath);

    const files = require('fs').readdirSync(directory)
    if (files.includes('index.js')) {
      if (ignoreRegex && !ignoreRegex.test('index.js'))
        Loggerwarn(`${directory} includes an index.js file that the passed ignoreRegex ${ignoreRegex} does not match. \nThis means it will be required along with other files. That may not be what you want.`);
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
      if (m[namespace]) {
        //store potentially incomplete reference containing the namespace here
        modules[path.basename(result.value, '.js')] = m;
      }
      result = iterator.next();
    }

    //Now bring the namespaced modules to top after all have been required
    //this should resolve circular dependency problems if any
    const moduleNames = Object.keys(modules);
    for (let moduleName of moduleNames) {
      modules[moduleName] = modules[moduleName][namespace];
    }

    return modules;
  }

  static get DEF_GLOBAL_PROXY_HANDLER() {
    return {
      get(target, name) {
        if (name in target) return target[name];
        else throw new ReferenceError(`This global object has no enumerable property "${name}"`);
      }
    }
  }

  static installGlobal(object, name) {
    if (Object.keys(global).includes(name)) throw new Error(`A variable by "${name}" already exists at global scope, choose a different name!`);
    //create a proxy to watch changes and prevent pollution
    const proxy = new Proxy(object, Utils.DEF_GLOBAL_PROXY_HANDLER);
    global[name] = proxy;
  }

  static requireModels() {
    let models = Utils.requireNamespace('data', 'model');
    return models;
  }

  static getObjectClassName(object) {
    if(object.constructor.name === 'Function' && object.name)
      return object.name;
    if(object.constructor.name !== 'Object')
      return object.constructor.name;
    else
      return object.toString().split('(' || /s+/)[0].split(' ' || /s+/)[1];
  }

  static flatten(array) {
    return array.reduce((a, b) => a.concat(b), []);
  }

  static isBasicType(value) {
    return Object.keys(value) === 0 || typeof value === 'string';
  }

  /**
   * Merge two arrays, updating entries in first with corresponding entries from second array when comparatr returns true
   * and appending the rest of the entries from the second array to end of the first, returning array1, modified in palce
   * @param {Array} array1 the array to merge with
   * @param {Array} array2 the array to merge to
   * @param {Function} comparator function taking two parameters, the first is value from array1, second value from array2, that will determine whether to merge values or append
   * @returns {Array} array1, modified
   */
  static arrayMerge(array1, array2, comparator){
    if(typeof comparator !== 'function') throw new Error('merger must be a function');    
    for(let i=0; i<array2.length; i++){
      let found = array1.findIndex(val=>comparator(val, array2[i]));
      if(found>-1) {
        array1[found] = array2[i];
      } else {
        array1.push(array2[i]);
      }
    }
    return array1;
  }

  /**
   * Returns a generator that will iterate an object's enumerable properties, compatible with for..of loops
   * @param {*} object whose enumerable properties will be iterated
   * @returns {Generator} a generator that conforms to the iterator protocol
   */
  static *iterateObject(object){
    for(let key in object){
      if(object.hasOwnProperty(key)){
        yield [ key, object[key] ];
      }
    }
  }

  /**
   * Checks if the passed object is a JSON-serializable data object. 100% legit no fake (2017)
   * @param {*} object to test for legitimacy
   * @returns {Boolean} true if legit, false if busted
   */
  static legitObject(object){
    //seems legit
    return typeof object === 'object' && object.constructor === Object && JSON.stringify(object);
  }

  /**
   * The true God.
   * @param {Array} from the universe
   * @param {Boolean} remove humbly request thy object be freed of the physical
   * @returns {*} the chosen one to echo through the ages
   */
  static selectRandom(from, remove){
    if (!Array.isArray(from)) throw new Error("from must be an array of choices! Was " + from);
    if (from.length === 0) throw new Error("Can't select from an empty array");
    let rand = Math.round(Utils.random(0, from.length - 1));
    let value = from[rand];
    if (remove === true) {
      from.splice(rand, 1);      
    }
    return value;
  }

  static random(min, max){
    return min + ((max-min) * Math.random());
  }

  static generateArray(times, generator, ...args){
    const result = [];
    for(let i = 0; i<times; i++){
      result.push(generator(i, ...args));
    }
    return result;
  }
}

module.exports = Utils;