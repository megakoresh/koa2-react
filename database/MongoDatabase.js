const Database = require('./Database');
const mongodb = require('mongodb');
const { Logger } = require('common');

//static pool that holds connections for all instances of the database
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
    const db = await this.connect();
    const collection = db.collection(collectionName);
    let cursor = collection.find(query);
    return cursor;
  }

  async insert(data, collectionName){
    const db = await this.connect();    

    const collection = await db.collection(collectionName);
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
    const db = await this.connect();

    const collection = db.collection(collectionName);
    let result = await collection.updateMany(query, {$set: data});
    Logger.info(`Updated ${result.modifiedCount} objects in collection ${collectionName}`);
    return result;
  }

  async delete(query, collectionName){
    const db = await this.connect();

    const collection = db.collection(collectionName);    
    let result = await collection.deleteMany(query);
    Logger.info(`Deleted ${result.deletedCount} objects in collection ${collectionName}`);

    return result;
  }

  //separate method for consistency
  async count(query, collectionName){
    const db = await this.connect();
    return await db.collection(collectionName).find(query).count();
  }

  async connect(){
    let db;
    if(CONNECTION_POOL[this.url]) {
      db = CONNECTION_POOL[this.url];
    } else {
      db = await mongodb.MongoClient.connect(this.url);
      CONNECTION_POOL[this.url] = db;
      Logger.info(`Opened database connection ${this.url}`);
    }    
    return db;
  }

  async disconnect(){    
    await CONNECTION_POOL[this.url].close();
    delete CONNECTION_POOL[this.url];
    Logger.ingo(`Closed db connection ${this.url}`);
    return this;
  }
}
