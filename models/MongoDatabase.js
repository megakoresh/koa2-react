const Database = require('./Database');
const mongodb = require('mongodb');
const logger = require('winston');

const CONNECTION_POOL = {};

/**
 * MongoDB interface between the models and the driver
 * It is lazy-loaded meaning the model is only initialized when
 * first instance is created, and the actual connection
 * happens only when the first query is run - that's
 * what the super.ensureConnected(collectionName) is for.
 * 
 * Using this structure we can define many database classes
 * that use a universal 'interface' - the class implements
 * database-specific connect() method, that the superclass
 * will call. As a result the Model class does not have to
 * know anything about individual database classes and just
 * use the base Database class - similar to typed languages.
 * As an added benefit this way you can enforce a codebase
 * structure for any person on the team - old or new, they will
 * have to implement their database classes with these methods
 * otherwise the app won't work and tests won't pass.
 */
class MongoDatabase extends Database {

  constructor(url){
    super(url, mongodb);
  }

  async select(query, collectionName){
    await super.ensureConnected(collectionName);

    if(typeof query === 'string') query = {_id: query};

    const collection = this.db.collection(collectionName);
    //One of the reasons why I am not a fan of mongo is it's unconventional
    //approach to retrieval operations. Instead of performing a connection
    //on find, it only starts the async operations when you call
    //the cursor methods. Before that you don't even know if you are
    //connected, authorized or if the collection exists. For that
    //reason, I conventionally made all of the database methods 
    //asyncronous by default and even though MongoDB doesn't do any
    //async code before you start to need the data, I verify above
    //that the pending operation will at least have a chance at being
    //executed in the first place
    let cursor = collection.find(query);
    return cursor;
  }

  async insert(data, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);
    let result;
    if(data instanceof Array){
      result = await collection.insertMany(data);
    } else {
      result = await collection.insertOne(data);
    }
    logger.info(`Inserted ${result.insertedCount} records into collection ${collectionName}`);
    return result;
  }

  async update(query, data, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);
    //Again an example of inconsistency in the mongo driver
    //while find(), collection() and aggregate() do not perform
    //any operations before you need the data: insert, update 
    //and delete - do. So the R in CRUD behaves differently to
    //everything else in MongoDB. Partly this is abstracted by this
    //template's convention, but you still have to remember to call
    //await cursor.next() and await cursor.toArray() for any retrieval
    //operations
    let result = await collection.updateMany(query, {$set: data});
    logger.info(`Updated ${result.modifiedCount} objects in collection ${collectionName}`);
    return result;
  }

  async delete(query, collectionName){
    await super.ensureConnected(collectionName);

    const collection = this.db.collection(collectionName);    
    let result = await collection.deleteMany(query);
    logger.info(`Deleted ${result.deletedCount} objects in collection ${collectionName}`);

    return result;
  }

  //for mongo this is not very relevant, since count is no different to the driver
  //than find().count() query, but for sake of compatibility with SQL (and cleaner code), where COUNT is a
  //whole different story, this is still a separate method
  async count(query, collectionName){
    await super.ensureConnected(collectionName);

    return await this.db.collection(collectionName).find(query).count();
  }

  collection(collectionName){
    return this.db.collection(collectionName);
  }

  async connect(collectionName){
    if(CONNECTION_POOL[this.url]) this.db = CONNECTION_POOL[this.url];
    else {
      this.db = await mongodb.MongoClient.connect(this.url);
      CONNECTION_POOL[this.url] = this.db;
      logger.info(`Opened database connection ${this.url}`);
    }
    if(collectionName){
      //if collection doesn't exist, create it
      await this.db.createCollection(collectionName);
    }
    return this;
  }

  async disconnect(){
    if(this.db) await this.db.close();
    delete CONNECTION_POOL[this.url];
    logger.ingo(`Closed db connection ${this.url}`);
    return this;
  }
}

module.exports = MongoDatabase;