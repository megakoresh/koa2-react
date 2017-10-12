const Utils = require('common').Utils;
const Model = require('./Model');
const logger = require('winston');

/**
 * Holds a number of records or model instances.
 * The records an instance of Association holds can either be
 * instances of Model subclass for which association is create (e.g. User)
 * or data (JSON) with which such an instance can be created (e.g. { id: 1 } or "somemongodbidasstring")
 * 
 * Behaves like an array - access raw data using modelRecord.assocField[0]
 * To actually fetch most recent value from the database use await modelRecord.assocField.get(0)
 * To completely populate Association call await modelRecord.assocField.populate() or
 * await modelRecord.assocField.where(queryToFetchWhatYouNeed) and then access the 
 * now up-to-date records with modelRecord.assocField[0..n-1]. You can obtain a list of
 * currently in-memory primary records via modelRecord.assocField.toJSON()
 * 
 * Note that association is merely a conduit between two Model instances and doesn't handle
 * database-specific operations. If you want to wrap, for example, join tables or make populate
 * automatically retreive all values of the association, even when IDs are missing from memory
 * you need to subclass this and override methods according to the database and driver you use.
 * E.g. 
 * class ManyToOneAssociation extend Association {
 * constructor(classObject, initialRecords, foreignKey, parent){
 *   super(classObject, initialRecords);
 *   this.foreignKey = foreignKey;
 *   this.parent = parent;
 * }
 * 
 * async populate(){
 *   if(!parent.id) //throw or parent.save()
 *   return await this.where(`${this.foreignKey} IN (?)`, parent.id);
 * }
 * ...
 */
module.exports = class Association {
  constructor(classObject, records){    
    this.records = records ? Utils.flatten([records]) : []; //allows to accept both single values and arrays
    if(!(classObject instanceof Model)) throw new TypeError(`Association must be created with a valid Model class which it is associating, was ${Utils.getCurrentClassName(classObject)}`);
    this.model = classObject; //reference to the class for which association exists
    return new Proxy(this, this.validator())    
  }

  async save(){
    const saves = [];
    try {
      await this.model.beginTransaction();
      for(let i=0; i<this.length; i++){
        if(this[i] instanceof Model){        
          saves.push(this[i].save());
        } else {
          //not a Model, assume it's record data we can only save by instantating a record and calling save()
          //allow or deny this inefficient behaviour?
          this[i] = new this.model(this[i]);
          saves.push(this[i].save());
        }
      }
      await Promise.all(saves); //avoid putting await or yield into a loop unless absolutely necessary
      await this.model.commitTransaction();
    } catch (err){
      logger.error(`Could not save ${this.recods.length} associated records of ${Utils.getCurrentClassName(this.model)}`);
      logger.error(err);
      await this.model.rollbackTransaction();
    }
  }

  async delete(){
    await this.model.beginTransaction();
    let numDeleted = await this.model.delete(this.toJSON()); //delete by IDs
    await this.model.commitTransaction();
    return numDeleted;
  }

  async get(index){
    if(index > this.records.length) throw new Error(`${index} is greater than number of associated records`);
    return await this[index].get();
  }

  //TODO: async populate() { /* update all currently held records and populate the records */ }

  /**
   * Filters the current association records by provided query, replacing all contained records with the ones returned from the query.
   * Note that depending on the model, this will parse all results to memory and construct a model for each row.
   * @param {*} query database query which will be passed to the associated Model's where method
   * @returns {Association} the current association object, populated with the query results to be used as usual
   */
  async where(query){
    try {
      let results = await this.model.where(query);
      this.records = results;
    } catch (err){
      logger.error(`Error filtering associated records: ${err.message} \n Query: ${query}`);    
    }
  }

  validator(){
    return {
      get(assoc, property, receiver){
        if(!assoc.records) throw new Error('Association is missing "records" property, has it been constructed properly?');
        if(!assoc.model) throw new Error('Association is missing "model" property, has it been constructed properly?');
        if(typeof property === 'number' && assoc.records[property]){          
          if(assoc.records[property] instanceof Model) return assoc.records[property]; //return the associated record instance or...
          else return new assoc.model(assoc.records[property]); //...construct the model from record on access
        }
        return assoc[property]; //allow access to functions
      },
      set(target, property, value, receiver){
        if(!assoc.records) throw new Error('Association is missing "records" property, has it been constructed properly?');
        if(!assoc.model) throw new Error('Association is missing "model" property, has it been constructed properly?');
        if(typeof property === 'number') {
          assoc.records[property] = value;
        }
        assoc[property] = value;
      }
    }
  }

  //overrides JSON.stringify behaviour, when you call JSON stringify on this
  toJSON(){
    const ids = [];
    for(let i=0;i<this.length;i++){
      if(this[i] instanceof Model && this[i].id){
        ids.push(this[i].id);
      } else if(Utils.isBasicType(this[i])){ 
        ids.push(this[i]);        
      } else {
        ids.push(this[i].id || this[i]._id); //TODO: maybe add a getPrimaryKey() method to Model?
      }
    }
    return ids;
  }

  push(value){
    this[this.records.length] = value; //invokes the proxy
  }
}