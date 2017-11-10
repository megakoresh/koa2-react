const mongodb = require('mongodb');
const MongoModel = require('./MongoModel');
const { MongoDatabase, DEF_MONGO } = require('database');
const { Utils, Logger, config } = require('common');

let db = DEF_MONGO;
let collectionName = 'users';

class User extends MongoModel {
  constructor(data) {
    super(data);
    this.deserialize(data);
  }

  deserialize(data) {
    if (typeof data === 'string') return;
    super.deserialize(data); //use parent's logic to set other attributes
  }

  get comments() {
    return Comment.where({ userId: this.id });
  }

  async addComments(...texts) {
    let comments = await Comment.insert(texts.map(text => ({ text: text, likes: 0, userId: this.id })));
    return comments;
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
    return User.DB;
  }

  get datastore() {
    return User.DATASTORE;
  }
}

exports.model = User;