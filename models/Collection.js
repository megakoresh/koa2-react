const { Utils, Logger } = require('common');
const Model = require('./Model');
const { Database } = require('database');

/**
 * Multiple record Collection for one to many and many to one
 * type of associations.
 */
module.exports = class Collection {
  constructor(parent, childmodel, db, datastore, property, records){
    if(!(childmodel.prototype instanceof Model)) throw new Error('childmodel must be class deriving from Model');
    if(!(parent instanceof Model)) throw new Error('parent must be an instance of Model');
    if(!(db instanceof Database)) throw new Error('db must be a database instance');
    if(records && !(records instanceof Array)) throw new Error('Initial records for collection must be an array');
    if(typeof property !== 'string') throw new Error('Collection property should be a string');

    this.parent = parent;
    this.childmodel = childmodel;

    this.db = db || childmodel.DB;
    this.datastore = datastore || childmodel.DATASTORE;
    this.property = property || 'id';
    this.records = records || [];
    return new Proxy(this, this.validator());
  }

  validator(){
    return {
      get(collection, property, receiver){
        if(!collection.records) throw new Error('Collection is missing "records" property, has it been constructed properly?');
        if(!collection.childmodel) throw new Error('Collection is missing "model" property, has it been constructed properly?');
        if(!collection.parent) throw new Error('Collection missing parent reference, has it been constructed propery?');
        if(property == 'length') return collection.records.length;
        if(property.match(/[0-9]+/) && collection.records[property]){
          //I try to avoid creating new variables here, because this operation should have as little overhead as possible
          if(typeof collection.records[property] === 'object' && collection.records[property] instanceof collection.childmodel) return collection.records[property];          
          else {
            //on first access to this property, construct the actual record from it (later it should just return the reference)
            collection.records[property] = new collection.childmodel(collection.records[property]);
            return collection.records[property];
          }
        }        
        return collection[property]; //allow access to functions
      },
      set(target, property, value, receiver){
        if(!assoc.records) throw new Error('Collection is missing "records" property, has it been constructed properly?');
        if(!assoc.model) throw new Error('Collection is missing "model" property, has it been constructed properly?');
        if(typeof property === 'number') {
          assoc.records[property] = value;
        }        
        assoc[property] = value;
        return true;
      }
    }
  }

  async get(query){
    throw new Error('Collection.get is abstract and must be implemented by subclasses');
  }

  async save(){
    throw new Error('Collection.get is abstract and must be implemented by subclasses');
  }

  update(...moreRecords){
    throw new Error('Collection.update is abstract and must be implemented by subclasses');
  }

  push(newRecord){
    this.update(newRecord);
  }

  forEach(fn){
    this.records.forEach(fn);
  }
}
