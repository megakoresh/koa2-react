const mongodb = require('mongodb');
const MongoCollection = require('./MongoCollection');
const MongoModel = require('./MongoModel');

const { MongoDatabase } = require('database');
const { Utils, Logger } = require('common');

let db = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_USER']}:${process.env['MONGO_PASSWORD']}@${process.env['MONGO_HOST']}/koa2_react`));
let collectionName = 'users';
let Comment = require('./Comment').model;

class User extends MongoModel {
  constructor(data) {
    super(data);
    this.deserialize(data);
  }

  deserialize(data) {  
    if (typeof data === 'string') return;
    this.comments = new MongoCollection(this, Comment, Comment.DB, Comment.DATASTORE, 'user');
    for (let [key, value] of Object.entries(data)) {
      switch (key) {
        //special procesing for some keys
        case 'comments':
          this.comments.update(value);
          break;
      }
    }
    super.deserialize(data); //use parent's logic to set other attributes
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

  static async count(query) {
    return await MongoModel.count(query, User.DB, User.DATASTORE);
  }

  static async where(query) {
    const results = await MongoModel.where(query, User.DB, User.DATASTORE);    
    return results.map(data => new User(data));
  }

  static async find(query) {
    let results = await MongoModel.find(query, User.DB, User.DATASTORE);
    if (!results) return null;
    return new User(results);
  }

  static async delete(query) {
    return await MongoModel.delete(query, User.DB, User.DATASTORE);
  }

  static async update(query, data) {
    return await MongoModel.update(query, data, User.DB, User.DATASTORE);
  }

  static async insert(data) {
    //TODO: verify
    const results = await MongoModel.insert(data, User.DB, User.DATASTORE);
    return results.map(data => new User(data));
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

  get db() {
    return User.DB;
  }

  get datastore() {
    return User.DATASTORE;
  }

  async save(asNew) {
    let newRecord = await super.save(asNew);
    return newRecord;
  }

  async delete() {
    let deleted = await super.delete();
    return deleted;
  }
}

exports.model = User;
exports.load = function(otherModels){  
  Comment = otherModels['Comment'];
  return User;
}