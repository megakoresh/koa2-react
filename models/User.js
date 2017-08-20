const Model = require('./Model');
const mongodb = require('mongodb');
const MongoDatabase = require('./MongoDatabase');

const db = new MongoDatabase('mongodb://mongouser:mongopass@mongohosting.mongo:27015/my_WONDERFUL_database');
const collectionName = 'users';

//if you have e.g. 10 models all that mongo-specific code is gonna be annoying to repeat
//simply extend Model with MongoModel and offload all mongo-specific functionality there
//you can do the same with any database.
class User extends Model {
  constructor(data){
    super(data);
    this.id = data._id; //override for mongo ID
    this.username = data.username;
    this.avatar = data.avatar;

    let comments = data.comments || [];
    this.comments = new Association(Comment, comments);
  }

  static transformQuery(query){
    if(query.id) {
      query._id = query.id;
      delete query.id;
    }
    if(query instanceof Array && query.every(v=>typeof v === 'string')) query = { '$in': query };
    return query;
  }

  static async where(query){  
    //transform query for this model
    query = User.transformQuery(query);

    const results = await db.select(query, collectionName);
    return results.toArray().map(data=>new User(data));
  }

  static async find(query){
    let results = await db.select(query, collectionName);
    results = results.next();
    return new User(results);
  }

  static async datastore(){
    return db.collection(collectionName);
  }

  static async delete(query){
    query = User.transformQuery(query);
    return await db.delete(query, collectionName);
  }

  static async update(query, data){
    query = User.transformQuery(query);
    return await db.update(query, data, collectionName);
  }

  serialize(){
    return {
      _id: this.id,
      username: this.username,
      avatar: this.avatar
    }
  }

  async save(){
    let data = serialize();
    if(this.id){
      await db.update({_id: this.id}, data, collectionName);
    } else {
      //TODO: add your validations here
      await db.insert(data, collectionName);
    }
    return this;
  }

  async delete(){
    const results = await db.delete({_id: this.id}, collectionName);
    //do something with results, e.g. if CASCADE is not set, you might need to run through all associations and delete them all
    return this;
  }
}

module.exports = User;