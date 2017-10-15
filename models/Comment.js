const mongodb = require('mongodb');
const MongoModel = require('./MongoModel');

const { Logger, Utils } = require('common');
const { MongoDatabase } = require('database');

let collectionName = 'comments';
let db = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_USER']}:${process.env['MONGO_PASSWORD']}@${process.env['MONGO_HOST']}/koa2_react`));
let User = require('./User').model;

class Comment extends MongoModel {
  constructor(data) {
    super(data);
    this.likes = 0;
    this.deserialize(data);
  }

  static set DB(newdb) {
    if (newdb instanceof MongoDatabase) {
      Logger.warn(`Warning! Switching database for ${Utils.getCurrentClassName(this)}! All records from now on will operate with ${newdb.url}`);
      db = newdb;
    } else {
      throw new TypeError(`This model only supports MongoDatabase type, was ${newdb.constructor.name}`);
    }
  }

  static get DB() {
    return db;
  }

  static get DATASTORE() {
    return collectionName;
  }

  get db() {
    return Comment.DB;
  }

  get datastore() {
    return Comment.DATASTORE;
  }

  static async count(query) {
    return await MongoModel.count(query, Comment.DB, Comment.DATASTORE);
  }

  static async where(query) {
    const results = await MongoModel.where(query, Comment.DB, Comment.DATASTORE);    
    return results.map(data => new Comment(data));
  }

  static async find(query) {
    let results = await MongoModel.find(query, Comment.DB, Comment.DATASTORE);
    if (!results) return null;
    return new Comment(results);
  }

  static async delete(query) {
    return await MongoModel.delete(query, Comment.DB, Comment.DATASTORE);
  }

  static async update(query, data) {
    return await MongoModel.update(query, data, Comment.DB, Comment.DATASTORE);
  }

  static async insert(data) {
    //TODO: verify
    const results = await MongoModel.insert(query, data, Comment.DB, Comment.DATASTORE);
    return results.map(data => new Comment(data));
  }

  serialize(withId) {
    const data = super.serialize();
    try {
      if (withId) data._id = new mongodb.ObjectId(this.id);
      return data;
    } catch (e) {
      Logger.error(`Serialization error for an instance of User: ${e.message}`);
      throw new Error('Model serialization error, see above message for details.');
    }
  }

  deserialize(data) {  
    if (typeof data === 'string') return;
    for (let [key, value] of Object.entries(data)) {
      switch (key) {
        //special procesing for some keys
        case 'user':
          if (typeof value === 'object' && value instanceof User) this.user = value;
          else this.user = new User(value);
          break;
      }
    }
    super.deserialize(data); //use parent's logic to set other attributes(schemaless mode)
  }

  async save() {
    if (!this.user) throw new Error('No user association provided for comment, a comment can not exist without user!')
    let newRecord = await super.save();
    return newRecord;
  }

  async delete() {
    let deleted = await super.delete();
    return deleted;
  }
}

exports.model = Comment;
exports.load = function(otherModels){
  User = otherModels['User'];
  return Comment;
}