const MongoModel = require('./common/MongoModel');
const MongoDatabase = require('./common/MongoDatabase');
const Association = require('./common/Association');
const logger = require('winston');
const mongodb = require('mongodb');

//an object for the database connection can use separate or same urls - 
//our MongoDatabase class will make sure no unnecessary duplicates are created
//This allows us to use multiple databases and database techniques behind
//a reasonable level of abstraction. 

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

class User extends MongoModel {
  constructor(data){
    super(User.DB, User.COLLECTION, data);
    //intiate fields that must exist before any other logic happens
    this.comments = new Association(Comment, []);

    //you can return a proxy instead of default object to further stengthen your code
    //return new Proxy(this, { set: (target, keyName, value, receiver)=>{...} })
  }

  deserialize(data){
    for (let [key, value] of Object.entries(data)) {
      switch(key){
        //special procesing for some keys
        case 'comments':
          if(!(value instanceof Array)) logger.error(`comments supplied to User constructor, but wasn't an array, problems may ensue!`)
          this.comments = new Association(Comment, value);
          break;
      }
    }
    super.deserialize(data); //use parent's logic to set other attributes
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

  static async count(query){
    return await MongoModel.count(query, User.DB, User.COLLECTION);
  }

  static async where(query){  
    const results = await MongoModel.where(query, User.DB, User.COLLECTION);
    return results.map(data=>new User(data));
  }

  static async find(query){
    let results = await MongoModel.find(query, User.DB, User.COLLECTION);
    if(!results) return null;
    return new User(results);
  }

  static async delete(query){
    return await MongoModel.delete(query, User.DB, User.COLLECTION);
  }

  static async update(query, data){
    return await MongoModel.update(query, data, User.DB, User.COLLECTION);
  }

  static async insert(data){
    const results = await MongoModel.insert(data, User.DB, User.COLLECTION);
    return results.map(data => new User(data));
  }

  serialize(withId){    
    const data = super.serialize();    
    try {
      JSON.stringify(data);
      return data;
    } catch(e) {
      logger.error(`Serialization error for an instance of User: ${e.message}`);      
      throw new Error('Model serialization error, see above message for details.');
    }    
  }

  async save(asNew){
    let newRecord = await super.save(asNew);
  }

  async delete(){
    let deleted = await super.delete();
    //do something else, some kind of cleanup
    await this.comments.delete();
    return deleted;
  }
};

exports.model = User;