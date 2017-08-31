const Model = require('./Model');
const MongoDatabase = require('./MongoDatabase');

//same database as users as you see, so you can put it into config.js and require it here instead
const db = new MongoDatabase(`mongodb://${process.env['MONGO_USER']}:${process.env['MONGO_PASSWORD']}@${process.env['MONGO_HOST']}/koa2_react`);

//we could save comments as a sub-document in User model, but for sake of demonstration, we'll use a separate collection
const collectionName = 'comments';

//You might notice that the code is pretty much identical to User - this is why
//it's a good idea to create a generic MongoModel and extend it, makiing good
//use of the class hierarchy feature
class Comment extends Model {
  constructor(data){
    super(data);
    this.id = (data._id) ? data._id : data.id; //override for mongo ID
    this.text = data.text;
    this.likes = data.likes;
    //you can also extend Association with mongo-specific behaviour, then your models would use MongoAssociation instead
    this.user = new Association(User, data.user);
  }

  //allow access to the raw database just in case
  static get DB(){
    return db;
  }

  //collection name of the model
  static get COLLECTION(){
    return collectionName;
  }

  static transformQuery(query){
    if(query.id) {
      query._id = query.id;
      delete query.id;
    }
    //if query is an array of strings, assume it's a set of IDs to search for
    if(query instanceof Array && query.every(v=>typeof v === 'string')) query = { '_id': { '$in': query } };
    return query;
  }

  static async where(query){  
    //transform query for this model
    query = Comment.transformQuery(query);

    const results = await Comment.DB.select(query, Comment.COLLECTION);
    return results.toArray().map(data=>new Comment(data));
  }

  static async find(query){
    let results = await Comment.DB.select(query, Comment.COLLECTION);
    results = results.next();
    return new Comment(results);
  }

  static async datastore(){
    return Comment.DB.collection(Comment.COLLECTION);
  }

  static async delete(query){
    query = Comment.transformQuery(query);
    return await Comment.DB.delete(query, Comment.COLLECTION);
  }

  static async update(query, data){
    query = Comment.transformQuery(query);
    return await Comment.DB.update(query, data, Comment.COLLECTION);
  }

  serialize(){
    return {
      _id: this.id,
      text: this.text,
      user: this.user.id || this.user, //allow for both full user record and just ID
      likes: this.likes
    }
  }

  async save(){
    let data = serialize();
    if(this.id){
      await Comment.DB.update({_id: this.id}, data, Comment.COLLECTION);
    } else {
      //TODO: add your validations here
      await Comment.DB.insert(data, Comment.COLLECTION);
    }
    return this;
  }

  async delete(){
    const results = await Comment.DB.delete({_id: this.id}, Comment.COLLECTION);    
    return this;
  }
}
module.exports = Comment;