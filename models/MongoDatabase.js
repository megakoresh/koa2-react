const Database = require('./Database');
const mongodb = require('mongodb');
const logger = require('winston');

const CONNECTION_POOL = {};

/**
 * MongoDB interface between the models and the driver
 */
class MongoDatabase extends Database {

  constructor(url){
    super(url, mongodb);
  }

  async select(query, collectionName){
    await super.ensureConnected();

    if(typeof query === 'string') query = {_id: query};

    const collection = await this.db.collection(collectionName);
    let results = await collection.find(query);
    return results;
  }

  async insert(data, collectionName){
    await super.ensureConnected();

    const collection = this.db.collection(collectionName);
    let result;
    if(data instanceof Array){
      result = await collection.insertMany(data);
    } else {
      result = await collection.insertOne(data);
    }
    logger.info(`Inserted ${result.insertedCount} records into collection ${collectionName}`);
    return result.ops;
  }

  async update(query, data, collectionName){
    await super.ensureConnected();

    const collection = await this.db.collection(collectionName);
    let result = await collection.updateMany(query, {$set: data});
    logger.info(`Updated ${result.modifiedCount} objects in collection ${collectionName}`);
    return result;
  }

  async delete(query, collectionName){
    await super.ensureConnected();

    const collection = await this.db.collection(collectionName);
    let result = await collection.deleteMany(query);
    logger.info(`Deleted ${result.modifiedCount} objects in collection ${collectionName}`);

    return result;
  }

  async connect(){
    if(CONNECTION_POOL[this.url]) this.db = CONNECTION_POOL[this.url];
    else {
      this.db = await mongodb.MongoClient.connect(this.url);
      CONNECTION_POOL[this.url] = this.db;
    }
    return this;
  }

  async disconnect(){
    if(this.db) await this.db.close();
    delete CONNECTION_POOL[this.url];
    return this;
  }
}

module.exports = MongoDatabase;