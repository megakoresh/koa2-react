//If you have a many to many relationship, you will need to subclass this one to fetch
//results from a join table/collection before creating the instances of the associated
//object. Then you'll need to use that association subclass from all associated models
//Alternatively you can just create an extra model for this, e.g. MemesSites extends Model
//that would simply have two associations meme and sites, then have Association to MemeSites
//from both Meme and Site models, so you could call await meme.sites.get() -> [ {meme: 1, site:2}, {meme:1, site:5} ]
//await sites = memes.sites.map(async site=> await site.get()) -> [{url: 'https://mymemesite.com', id: 2}, ...]

/**
 * This class just represents an association between two models, it shouldn't contain
 * any special database logic. You create an association with an array either IDs (primary keys)
 * or full data records of the associated model class, and you call get with some parameters
 * to obtain the underlying model. For example
 * user.comments.push(new Comment({text: 'Blabla'}));
 * user.comments.push("baj4jkbneknfbfhj776bnjhba0"); //presume this ID exists
 * user.comments[0]; //--> Comment {text:'Blabla'}
 * user.comments[1]; // --> Comment "baj4jkbneknfbfhj776bnjhba0"
 * user.comments.save(); //adds the new comment to database
 * user.comments[0]; //--> {text:'Blabla', id: "1j34kjhjbkllkmvnjsl43g0"}
 * await user.comments[1].get(); //get the association record at index 1
 * user.comments[1]; //--> {text: 'Holy crapsties!': id: "baj4jkbneknfbfhj776bnjhba0" }
 * 
 * Note that this should not be used if your association is a Mongo's subdocument.
 */
module.exports = 
class Association extends Array {  
  constructor(classObject, records){
    super(records.length);
    this.records = Association.flatten([records]); //allows to accept both single values and arrays
    this.model = classObject;
    for(let i = 0; i<this.length; i++){
      //from each record representation create an instance of associated model, either by ID or a new dataset
      this[i] = typeof this.records[i] === 'object' ? 
        new this.model(this.records[i]) : 
        new this.model({id: this.records[i]});
    }
  }

  /**
   * Ideally this should be a bulk operation, but
   * save() is the only model method that doesn't require
   * a database-specific query. If you extend this class
   * to MongoAssociation or SQLAssociation, or something
   * like that, you could replace this with a more efficient
   * database-specific operation.
   * 
   * You can also loop through records and update those who have
   * .id attribute, then insert all those who don't using 
   * model's insert operation calling .serialize() on each
   * instance
   */
  async save(){
    const saves = [];
    for(let i=0; i<this.length; i++){
      if(Object.keys(this[i]).length > 1){
        //assume its a model instance
        saves.push(this[i].save());
      }
    }
    await Promise.all(saves); //avoid putting await or yield into a loop unless absolutely necessary
  }

  async delete(){
    return await this.model.delete(this.toJSON());
  }

  //Helper to recursively flatten arrays
  static flatten(array){
    return array.reduce((acc, curr)=>(Array.isArray(curr) ? flatten(curr) : curr));
  }

  //overrides JSON.stringify behaviour, when you call JSON stringify on this
  toJSON(){
    const ids = [];
    for(let i=0;i<this.length;i++){
      ids.push(this[i].id ? this[i].id : this[i]);
    }
    return ids;
  }

  push(value){

  }
}