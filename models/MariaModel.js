const Model = require('./Model');
const { MariaDatabase } = require('database');
const { Utils, Logger } = require('common');

module.exports = 
class MariaModel extends Model {
  constructor(data){
    super(data);    
  }

  static parseWhere(where, params){
    if(!where) return [];
    if(Array.isArray(where) && where.every(item=>Number.isInteger(item))) return [ 'id IN (?)', where ];
    if(Utils.legitObject(where)) return [ where ];
    if(typeof where === 'string') return [ where, ...params ];
    if(Number.isInteger(where)) return [ `id = ${where}` ];
    throw new TypeError('Where parameter was not an array, plain object, string or integer');
  }

  //id, where clause or object
  static async find(where, ...params){        
    let [data] = await this.DB.select(this.DATASTORE, ...MariaModel.parseWhere(where, params));
    if(data.length>1) {
      Logger.warn(`Criteria passed to find matched unexpected amount of records (expected 1, matched ${data.length}, only the first record will be returned`);
    }
    return new this(data[0]);
  }

  static async where(where, ...params){            
    let [data] = await this.DB.select(this.DATASTORE, ...MariaModel.parseWhere(where, params));
    return data.map(dd=>new this(dd));
  }

  static async delete(where, ...params){
    let result = await this.DB.delete(this.DATASTORE, ...MariaModel.parseWhere(where, params));
    return result[0].affectedRows;
  }

  static async count(where, ...params){
    let result = await this.DB.count(this.DATASTORE, ...MariaModel.parseWhere(where, params));
    return result[0].count;
  }

  static async insert(...data){
    //make sure they can all be instantiated, since we don't wanna make a new query just to verify
    const products = [];
    data = Utils.flatten(data);
    data.forEach(item=>products.push(new this(item)));
    let inserted = await this.DB.insert(this.DATASTORE, ...data);
    for(let i = 0; i<data.length; i++){
      //TODO: this assumes that Promise.all in MariaDatabase that executes all the inserts will actually put them in the same order as they are passed. Is this always the case?
      products[i].id = inserted[i].insertId;
    }
    return products;
  }

  static async update(data, where, ...params){
    let result;    
    if(Array.isArray(data)){
      if(!data.every(item=>Utils.legitObject(item) && item.id)){
        throw new Error('To update multiple records, every update record data must contain the id attribute equal to that of the database row to match against');        
      }
      result = await this.DB.updateMultiple(this.DATASTORE, data, (query, item, index)=>query.where(`id = ${item.id}`));
    } else {
      result = await this.DB.update(this.DATASTORE, data, ...MariaModel.parseWhere(where, params));
    }
    return result;
  }

  static async query(sqlquery){
    if(!(sqlquery instanceof MariaDatabase.SQLQuery)) throw new Error('The raw query must be an instance of MariaDatabase.SQLQuery');
    return await this.DB.execute(sqlquery);
  }

  //If you want to run these in a transaction, you can simply allow an override of the database through a parameter
  //then pass the transaction database instance to the method when you need to.
  async save(){    
    if(this.id){
      let result = await this.db.update(this.datastore, this.serialize(), `id = ${this.id}`);
    } else {
      //only get the first query result, we don't expect more
      let [inserted] = await this.db.insert(this.datastore, this.serialize());
      this.id = inserted.insertId;
    }    
    return this;
  }

  async delete(){
    if(!this.id){
      Logger.warn('No id on Product, calling delete() is redundant');
      return this;
    }
    let result = await this.db.delete(this.datastore, `id = ${this.id}`);
    if(result.affectedRows !== 1) Logger.error(`Something went wrong during delete - expected affected rows to be 1, but got ${result.affectedRows}`);
    return this;
  }

  async get(){
    let result;
    //TODO: implementation of this method might vary quite severely. 
    //This is just an example of how it *could* be done - either by id or by combination of all available attributes
    if(!this.id){
      result = await this.db.select(this.datastore, this.serialize());
      if(result[0].length > 1) {
        Logger.error(`Tried to loose match a record ${this}, but the database returned more than 1 result. Ignoring.`)
        return this;
      }
    } else {
      result = await this.db.select(this.datastore, 'id = ?', this.id);      
    }
    let [data] = result;
    if(data.length === 0) {
      Logger.error(`Did not find record ${this} in the database.`);      
    } else {
      this.deserialize(data[0]);
    }
    return this;
  }
}