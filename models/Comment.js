const mongodb = require('mongodb');
const MongoModel = require('./MongoModel');
const { Logger, Utils, config } = require('common');
const { MongoDatabase, DEF_MONGO } = require('database');

let collectionName = 'comments';
let db = DEF_MONGO;

class Comment extends MongoModel {
  constructor(data) {
    super(data);
    this.likes = 0;
    this.deserialize(data);
  }

  get user() {
    return User.find(this.userId);
  }

  static set DB(newdb) {
    if (newdb instanceof MongoDatabase) {
      Logger.warn(`Warning! Switching database for ${Utils.getObjectClassName(this)}! All records from now on will operate with ${newdb.url}`);
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
}

exports.model = Comment;