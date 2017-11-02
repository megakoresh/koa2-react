const mongodb = require('mongodb')
const Model = require('./Model')
const { Logger, Utils } = require('common');

module.exports = class MongoModel extends Model {
  constructor(data){
    super(data);
    //since this is first line, if db is something other than a Database instance, it should crash right away    
    try {
      if(data._id) this.id = data._id.toString();
      else if(data.id) this.id = data.id;
      else if (typeof data === 'string') this.id = data;
    } catch (err){
      Logger.error(`Error assigning an ID to Mongo model wih collection name ${this.datastore}, data provided: \n ${JSON.stringify(data, 2)}`);
    }
  }

  /**
   * Transform the query object and fix some common problems like misspelling _id for id and so on.
   * If the query is an array, will recursively apply this function to every element
   * @param {JSON} query the query object
   * @returns {JSON} the transformed query that's hopefully sane enough to not completely freak out the driver...
   */
  static transformQuery(query){
    if(!query) return {};
    if(typeof query === 'string') return { _id: new mongodb.ObjectId(query) };
    if(query.id && !query._id && typeof query.id === 'string') {
      Logger.warn('Incorrect mongodb query format detected - replacing query.id with query._id');
      query._id = new mongodb.ObjectId(query.id);
      delete query.id;
    }
    if(query instanceof Array){
      if(query.every(qq=>typeof qq === 'string')) {
        return {
          _id: {
            $in: query.map(qq=>new mongodb.ObjectId(qq))
          }
        };
      }
    }
    return query;    
  }

  static async count(query, db, collection) {
    //lets us use the child's overridden getters, arguments, which allows the child to avoid implementing any of the common functions
    //unless they want special behaviour
    db = db || this.DB;
    collection = collection || this.DATASTORE;

    query = MongoModel.transformQuery(query);
    
    return await db.count(query, collection);
  }

  static async find(query, db, collection){
    db = db || this.DB;
    collection = collection || this.DATASTORE;

    query = MongoModel.transformQuery(query);    
    const cursor = await db.select(query, collection);
    const record = await cursor.next();
    //TODO: throw a 404 not found error - decide yourself how this should look
    return new this(record);
  }

  static async where(query, db, collection, returnCursor) {
    db = db || this.DB;
    collection = collection || this.DATASTORE;

    //transform query for this model
    query = MongoModel.transformQuery(query);    
    const cursor = await db.select(query, collection);
    if(!returnCursor) return (await cursor.toArray()).map(r=>new this(r));
    else return cursor;
  }

  static async delete(query, db, collection){
    db = db || this.DB;
    collection = collection || this.DATASTORE;

    query = MongoModel.transformQuery(query);
    const result = await db.delete(query, collection);
    return result.deletedCount;
  }

  static async update(query, data, db, collection){
    db = db || this.DB;
    collection = collection || this.DATASTORE;
    
    query = MongoModel.transformQuery(query);
    const result = await db.update(query, data, collection);
    return result.modifiedCount;
  }

  static async insert(data, db, collection){
    db = db || this.DB;
    collection = collection || this.DATASTORE;

    const result = await db.insert(data, collection);
    return result.ops.map(r=>new this(r));
  }

  async get(){
    const cursor = await this.db.select((this.id) ? new mongodb.ObjectId(this.id) : this.serialize(), this.datastore);
    const record = await cursor.next();
    if(record === null) throw new Error(`get() called on instance of ${Utils.getObjectClassName(this)}, but nothing was found, this record must have MongoDB id or other primary key set, was ${this.id}`);
    this.deserialize(record);
    return this;
  }

  async save(){  
    const serialized = this.serialize();
    let inserted = false;
    //could use mongo usert op here, but for sake of consistency across the board, we don't. Feel free to change that, that's why this is not a framework
    if(serialized._id){
      await MongoModel.update({_id: serialized._id}, serialized, this.db, this.datastore);
    } else {
      let insertResult = await this.db.insert(serialized, this.datastore);
      if(!insertResult) throw new Error(`MongoDatabase insert failed - no insertResult`);
      if(insertResult.ops.length === 0) Logger.warn(`Called save() on a new record, but no records were inserted!`);
      inserted = insertResult !== null && insertResult.ops[0];
      this.id = insertResult.ops[0]._id.toString();
    }
    return inserted;
  }

  async delete(){    
    const results = await MongoModel.delete(this.id, this.db,this.datastore);
    return results.deletedCount;
  }

  deserialize(data){
    super.deserialize(data);
    for (let [key, value] of Object.entries(data)) {
      if(this[key]) continue; //don't deserialize if it's already been processed
      switch(key){
        case '_id':
          this.id = value.toString();
          break;
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

  serialize(){    
    const data = super.serialize();    
    for (let [key, value] of Object.entries(this)) {      
      if(data[key]) continue; //dont serialize if its already been serialized      
      if(typeof value === 'undefined') continue; //don't serialize undefined fields
      if(typeof value === 'object'){
        if(value instanceof Collection) continue; //don't serialize collections
        if(value instanceof Model && value.id){          
          data[key] = value.id;
          continue;
        }
      }
      switch(key){        
        case 'id':
          data._id = new mongodb.ObjectId(value);
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
                Logger.error(`Could not serialize field ${key} - ${e.message}. The field value will not be saved!`);
              }
              break;
          }
          break;
      }
    }
    return data;
  }
}