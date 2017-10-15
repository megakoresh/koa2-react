const Database = require('./Database');
const mongodb = require('mongodb');
const { Logger } = require('common');

const CONNECTION_POOL = {};

/**
 * An example of implementing a MongoDB interface using the default template structure
 */
module.exports = 
class MongoDatabase extends Database {

  constructor(url){
    super(url, mongodb);    
  }

  async select(query, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);
    let cursor = collection.find(query);
    return cursor;
  }

  async insert(data, collectionName){
    await super.ensureConnected(collectionName);    

    const collection = await this.db.collection(collectionName);
    let result;
    if(data instanceof Array){      
      result = await collection.insertMany(data);
    } else {
      result = await collection.insertOne(data);
    }
    Logger.info(`Inserted ${result.insertedCount} records into collection ${collectionName}`);
    return result;
  }

  async update(query, data, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);
    let result = await collection.updateMany(query, {$set: data});
    Logger.info(`Updated ${result.modifiedCount} objects in collection ${collectionName}`);
    return result;
  }

  async delete(query, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);    
    let result = await collection.deleteMany(query);
    Logger.info(`Deleted ${result.deletedCount} objects in collection ${collectionName}`);

    return result;
  }

  //separate method for consistency
  async count(query, collectionName){
    await super.ensureConnected(collectionName);
    return await this.db.collection(collectionName).find(query).count();
  }

  collection(collectionName){
    return this.db.collection(collectionName);
  }

  async connect(collectionName){
    let db;
    if(CONNECTION_POOL[this.url]) db = CONNECTION_POOL[this.url];
    else {
      db = await mongodb.MongoClient.connect(this.url);
      CONNECTION_POOL[this.url] = db;
      Logger.info(`Opened database connection ${this.url}`);
    }
    if(collectionName){
      //if collection doesn't exist, create it
      await db.createCollection(collectionName);
    }
    return db;
  }

  async disconnect(){
    if(this.db) await this.db.close();
    delete CONNECTION_POOL[this.url];
    Logger.ingo(`Closed db connection ${this.url}`);
    return this;
  }
}
