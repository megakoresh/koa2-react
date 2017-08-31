const Model = require('./Model');
const MongoDatabase = require('./MongoDatabase');
const Association = require('./Association');
const Comment = require('./Comment');
const logger = require('winston');
const mongodb = require('mongodb');

//an object for the database connection can use separate or same urls - 
//our MongoDatabase class will make sure no unnecessary duplicates are created
//This allows us to use multiple databases and database techniques behind
//a reasonable level of abstraction. 

//Note how none, but the datastore() method returns anything 
//specifically mongo-related. While querie are unavoidably going
//to be written in the dialect of the database, the abstraction
//layer should at least isolate db-secific *logic*. As such
//the model methods handle all database-specific stuff, and
//should return only generic javascript objects to anything
//outside

//General pholosophy should be that the model 
//is the one that "knows" which database(s) is used to store it's records, and any
//database-specific logic should happen inside of the model, and not the controller.

//For example if you want to use MongoDB aggregation pipeline to aggregate
//user's email address hosts or some other information, then you would
//create a method in the User model called User.aggregateBy({String} attributeName)
//and use that from the controllers. In general try to keep 
// require('any-database-driver'); out of the controller, view or other middleware code
//That will let you have "unmixed" code, where each part is responsible for a fixed, independent
//and *testable* subset of functionality, which leads to more efficient, cleaner and less error-prone code
const db = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_USER']}:${process.env['MONGO_PASSWORD']}@${process.env['MONGO_HOST']}/koa2_react`));

//note - by placing something OUTSIDE of the module.exports block, you can
//effectively imitate "private" variables. You can use collectionName from
//inside User class, but nothing will be able to access it outside
const collectionName = 'users';

//if you have e.g. 10 models all that mongo-specific code is gonna be annoying to repeat
//simply extend Model with MongoModel and offload all mongo-specific functionality there
//you can do the same with any database. Then your models would be declared like
// class User extends MongoModel {...
class User extends Model {
  constructor(data){
    super(data);
    //intiate fields that must exist before any other logic happens
    this.comments = new Association(Comment, []);

    //this can be used as a schema, that supports other values not defined
    //explictly here. With schemaful database like MariaDB or Postgres, you
    //of course don't want to allow any extra fields - only the ones you
    //have columns for must be saved
    for (let [key, value] of Object.entries(data)) {
      //switch cases are a perfect, readable way
      //for any kind of type-related logic.
      //in general, in ANY language - if you need
      //to do something based on any type/mode/state,
      //switch case is the way to go
        switch(key){
          case 'id':
          case '_id':
            this.id = value.toString();
            break;
          case 'username':
            this.username = value;
            break;
          case 'avatar':
            this.avatar = value;
            break;
          case 'comments':
            if(!(value instanceof Array)) logger.error(`comments supplied to User constructor, but wasn't an array, problems may ensue!`)
            this.comments = new Association(Comment, comments);
            break;
          default:
            if(typeof value !== 'function'){
              //you might wanna do more checks here
              this[key] = value;
            }
            break;
        }
    }
  }
  
  /**
   * Conventionally with ES6 you can imitate private instance fields by defining them like this:
   * this._privateField = 'something private';
   * then use es6 getters to set and obtain them
   * get privateField(){
   *   return this._privateField;
   * }
   * 
   * set privateField(somethingElse){
   *   this._privateField = somethingElse;
   * }
   * I don't really like this approach tbh, since it makes code harder to read. If you are writing a library
   * for many people or if your company has more than 20 developers working on the code, it might be a good idea,
   * but in general to save yourself the headache of having to remember when to put _ in front of something
   * and when not, just avoid bad practices like appending functions and whatnot to objects dynamically
   * (if you have to do it, do it only once at the start if your app), and you will be fine.
   */

  //allow access to the raw mongodb driver's database instance, if it exists (ensureConnected called at least once)
  //this is like a getter for private static variable in Java
  static get DB(){
    return db;
  }

  //collection name of the model
  static get COLLECTION(){
    return collectionName;
  }

  //transform a standard query object into something compatible with this model's database - mongo
  static transformQuery(query){    
    if(query && query.id) {
      //another annoying issue is that mongodb driver does not accept strings for the ID fields
      //they have to converted to mongodb ObjectIds first or queries containing them will not match
      //anything. if the query already has a mongo-specific _id property, we assume it has 
      //already been converted to ObjectId
      query._id = new mongodb.ObjectId(query.id);
      delete query.id;      
    }
    //if query is an array of strings, assume it's a set of IDs to search for
    if(query instanceof Array && query.every(v=>typeof v === 'string')) query = { '_id': { '$in': query.map(q=>new mongodb.ObjectId(q)) } };
    return query;
  }

  static async count(query){
    query = User.transformQuery(query);

    return await User.DB.count(query, User.COLLECTION);
  }

  static async where(query){  
    //transform query for this model
    query = User.transformQuery(query);

    const cursor = await User.DB.select(query, User.COLLECTION);    
    //CAREFUL: cursor.toArray() will get ALL documents and put them in memory
    //if your app does any big data analysis that can mean millions upon millions
    //of entries. You will want to carefully consider how to proceed here,
    //but this is why this template does NOT abstract database driver methods
    //inside the Database class - it's up to the model to deal with it's specific
    //implementation
    const results = await cursor.toArray();
    return results.map(data=>new User(data));
  }

  static async find(query){
    let results = await User.DB.select(query, User.COLLECTION);
    results = await results.next();
    if(!results) return null;
    return new User(results);
  }

  static async delete(query){
    query = User.transformQuery(query);
    const result = await User.DB.delete(query, User.COLLECTION);
    return result.deletedCount;
  }

  static async update(query, data){
    query = User.transformQuery(query);
    const result = await User.DB.update(query, data, User.COLLECTION);
    return result.modifiedCount;
  }

  static async insert(data){
    data = data.map(ud=>new User(ud).serialize(true));
    const result = await User.DB.insert(data, User.COLLECTION);
    return result.ops.map(data => new User(data));
  }

  serialize(withId){    
    const data = super.serialize();
    //by definition ES6 class methods are not enumerable so we
    //don't have to worry about them ending up in this loop. However
    //you have to be careful not to add any other methods or unrelated fields
    //to the user instance at runtime, since javascript can do that.
    //be very careful with your libraries and watch what they do.

    //this is essentially the reverse if your constructor
    //in SQL databases, you of course wanna be more strict, just
    //like in constructor and only serialize values you have columns for
    for (let [key, value] of Object.entries(this)) {
      switch(key){
        case 'id':
          if(withId) data._id = value;
          break;
        case 'username':
          data.username = value;
          break;
        case 'avatar':
          data.avatar = value;
          break;
        case 'comments':
          //handle associations as appropriate for this model
          //in this case we don't need to do anything as we assume comments
          //are saved explicitly and separately
          break;
        default:
        //normally I frown on nesting switch cases, and would have offloaded this to
        //another function, but for sake of demonstration here it is
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
                JSON.stringify(value);
                data[key] = value;
              }catch(e){
                logger.error(`Could not serialize User field ${key} - ${e.message}. The field value will not be saved!`);
              }
              break;
          }
          break;
      }
  }

    
    try {
      JSON.stringify(data);
      return data;
    } catch(e) {
      logger.error(`Serialization error for an instance of User: ${e.message}`);      
      return null;
    }    
  }

  async save(id){
    let data = this.serialize();    
    if(this.id){
      //you could also do things like new mongodb.ObjectId(this.id) here if you want to be 100% compliant
      await User.DB.update({_id: this.id}, data, User.COLLECTION);      
    } else {
      if(id) data._id = id; //allow saving under a custom ID
      //TODO: add your validations here
      let insertOp = await User.DB.insert(data, User.COLLECTION);
      this.id = insertOp.insertedId.valueOf().toString(); //by default valueOf of a Mongo ID is apparently a buffer, we are assuming encoding to be UTF8 here
    }
    return this;
  }

  async delete(){
    const results = await User.DB.delete({_id: {'$in': [new mongodb.ObjectId(this.id)]}}, User.COLLECTION);
    //do something with results, e.g. if CASCADE is not set, you might need to run through all associations and delete them all
    return this;
  }
}
module.exports = User;