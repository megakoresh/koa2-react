const mongodb = require('mongodb')
const Model = require('./Model')
const Association = require('./Association');
const logger = require('winston');
const Utils = require('utils');

exports = class MongoModel extends Model {
  constructor(data){
    super(data);
    //since this is first line, if db is something other than a Database instance, it should crash right away    
    try {
      if(data._id) this.id = data._id.toString();
      else if(data.id) this.id = data.id;
    } catch (err){
      logger.error(`Error assigning an ID to Mongo model wih collection name ${collectionName}`)
    }
  }

  static transformQuery(query){
    //for empty query, return mongo equivalent of SELECT * FROM table;
    //might want to use some kind of default ordering here
    if(!query) return {};
    if(query.id) {
      query._id = new mongodb.ObjectId(query.id);
      delete query.id;
    }
    if(typeof query === 'string'){
      //assume its an ID string
      query = {_id: new mongodb.ObjectId(query)};
    }
    return query;
  }

  static async count(query, db, collection) {
    query = MongoModel.transformQuery(query);
    
    return await db.count(query, collection);
  }

  static async find(query, db, collection){
    query = MongoModel.transformQuery(query);    
    const cursor = await db.select(query, collection);
    const record = await cursor.next();
    //TODO: throw a 404 not found error - decide yourself how this should look
    return record;
  }

  static async where(query, db, collection) {
    //transform query for this model
    query = MongoModel.transformQuery(query);    
    const cursor = await db.select(query, collection);  
    return cursor;  
  }

  static async delete(query, db, collection){
    query = MongoModel.transformQuery(query);
    const result = await db.delete(query, collection);
    return result.deletedCount;
  }

  static async update(query, data, db, collection){
    query = MongoModel.transformQuery(query);
    const result = await db.update(query, data, collection);
    return result.modifiedCount;
  }

  static async insert(data, db, collection){
    const result = await db.insert(data, collection);
    return result.ops;
  }

  async get(){
    const cursor = await this.db.select((this.id) ? new mongodb.ObjectId(this.id) : this.serialize(), this.collection);
    const record = await cursor.next();
    this.deserialize(record);
    return this;
  }

  async save(asNew){
    //allow to override whether save creates a new record or updates existing one using this.id
    if(typeof asNew === 'undefined') asNew = this.id ? true : false;

    const serialized = this.serialize(asNew);    
    let inserted = false;
    if(serialized._id){
      await MongoModel.update({_id: serialized._id}, serialized, this.collection);
    } else {
      let insertResult = await MongoModel.insert(serialized, this.db, this.collection);
      inserted = insertResult !== null && insertResult.ops[0];
      this.id = inserted.ops[0]._id.toString();
    }
    return inserted;
  }

  async delete(){
    //since our database method always assumes it can delete more than one record, we have to write the query
    //this way. If the database was SQL, it would look like a normal query either way
    const results = await this.db.delete([this.id], this.collection);
    //do something with results, e.g. if CASCADE is not set, you might need to run through all associations and delete them all
    return results.deletedCount;
  }

  
  static set COLLECTION(newCollectionName){
    throw new Error(`${Utils.getCurrentClassName(this)} does not support changing collection name`);
  }

  //Force subclasses to implement these statically to make sure all instances refer to the same variable
  static get DB(){
    throw new Error(`MongoModel DB getter must be implemented by subclasses!`)
  }
  static get COLLECTION(){
    throw new Error(`MongoModel COLLECTION getter must be implemented by subclasses!`)
  }

  // Allows parent logic to use child class's database instance, if returned from this method
  // via ChildModel.DB
  get db(){
    throw new Error(`MongoModel db getter must be implemented by subclasses!`)
  } 
  // Allows parent logic to use child class's collection name, if returned from this method
  // via ChildModel.COLLECTION
  get collection(){
    throw new Error(`MongoModel collection getter must be implemented by subclasses!`)
  }

  deserialize(data){
    super.deserialize(data);
    for (let [key, value] of Object.entries(data)) {
      if(this[key]) continue; //don't deserialize if it's already been processed
      switch(key){
        //createdAt and updatedAt should be deserialized in superclass
        default:
          if(typeof value !== 'function'){
            //you might wanna do more checks here, e.g. add Model.validate(key) method and call here
            this[key] = value;
          }
          break;
      }
    }
  }

  serialize(withId){    
    const data = super.serialize();    
    for (let [key, value] of Object.entries(this)) {
      //dont serialize if its already been serialized
      if(data[key]) continue;
      if(value instanceof Association){
        //invoke default behaviour of Associated records
        data[key] = value.toJSON(); //store as array of IDs
        continue;
      }
      switch(key){
        case 'id':
          if(withId) data._id = new mongodb.ObjectId(value);
          break;
        default:
          switch(typeof value){
            //for any 'unknown' attributes serialize them if they are one of the
            //standard primitive types
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
            case 'undefined':
              data[key] = value;
              break;
            default:             
              try {
                //if the value is not primitive, then do that trick with the JSON.stringify
                JSON.stringify(value); //throws if invalid
                data[key] = value;
              } catch(e) {
                logger.error(`Could not serialize field ${key} - ${e.message}. The field value will not be saved!`);
              }
              break;
          }
          break;
      }
    }
    return data;
  }
}