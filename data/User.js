const MongoModel = require('./common/MongoModel');
const MongoDatabase = require('./common/MongoDatabase');
const Association = require('./common/Association');
const logger = require('winston');
const mongodb = require('mongodb');
const { Comment } = require('models');

// "private" variables
let db = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_USER']}:${process.env['MONGO_PASSWORD']}@${process.env['MONGO_HOST']}/koa2_react`));
const collectionName = 'users';

class User extends MongoModel {
  constructor(data){
    super(User.DB, User.COLLECTION, data);
    //intiate fields that must exist before any other logic happens
    this.comments = new Association(Comment, []);

    //you can return a proxy instead of default object to further stengthen your code
    //return new Proxy(this, { set: (target, keyName, value, receiver)=>{...} })
  }

  deserialize(data){
    for (let [key, value] of Object.entries(data)) {
      switch(key){
        //special procesing for some keys
        case 'comments':
          if(!(value instanceof Array)) logger.error(`comments supplied to User constructor, but wasn't an array, problems may ensue!`)
          this.comments = new Association(Comment, value);
          break;
      }
    }
    super.deserialize(data); //use parent's logic to set other attributes
  }

  static set DB(newdb){
    if(newdb instanceof MongoDatabase){
      logger.warn(`Warning! Switching database for ${Utils.getCurrentClassName(this)}! All records from now on will operate with ${newdb.url}`);      
      db = newdb;
    } else {
      throw new TypeError(`This model only supports MongoDatabase type, was ${newdb.constructor.name}`);
    }
  }

  get DB(){
    return db;
  }

  get COLLECTION(){
    return collectionName;
  }

  get db(){
    return User.DB;
  }

  get collection() {
    return User.COLLECTION;
  }

  static async count(query){
    return await MongoModel.count(query, User.DB, User.COLLECTION);
  }

  static async where(query){  
    const results = await MongoModel.where(query, User.DB, User.COLLECTION);
    return results.map(data=>new User(data));
  }

  static async find(query){
    let results = await MongoModel.find(query, User.DB, User.COLLECTION);
    if(!results) return null;
    return new User(results);
  }

  static async delete(query){
    return await MongoModel.delete(query, User.DB, User.COLLECTION);
  }

  static async update(query, data){
    return await MongoModel.update(query, data, User.DB, User.COLLECTION);
  }

  static async insert(data){
    const results = await MongoModel.insert(data, User.DB, User.COLLECTION);
    return results.map(data => new User(data));
  }

  serialize(withId){    
    const data = super.serialize();    
    try {
      JSON.stringify(data);
      if(withId) data._id = new mongodb.ObjectId(this.id);
      return data;
    } catch(e) {
      logger.error(`Serialization error for an instance of User: ${e.message}`);      
      throw new Error('Model serialization error, see above message for details.');
    }    
  }

  async save(asNew){
     let newRecord = await super.save(asNew);
     return newRecord;
  }

  async delete(){
    let deleted = await super.delete();
    //do something else, some kind of cleanup
    await this.comments.delete();
    return deleted;
  }
}

exports.model = User;