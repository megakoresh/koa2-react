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
 * user.comments[0]; //--> {text:'Blabla'}
 * user.comments[1]; // --> "baj4jkbneknfbfhj776bnjhba0"
 * user.comments.save(); //adds the new comment to database
 * user.comments[0]; //--> {text:'Blabla', id: "1j34kjhjbkllkmvnjsl43g0"}
 * await user.comments.get(1); //get the association record at index 1
 * user.comments[1]; //--> {text: 'Holy crapsties!': id: "baj4jkbneknfbfhj776bnjhba0" }
 */
class Association extends Array {
  
  constructor(classObject, records){
    super();
    if(typeof classObject !== 'function') throw new Error(`Attempted to pass ${classObject} as an association class, but it's type was ${typeof classObject}`);
    if(!records) throw new Error('Association invalid - records\'s were undefined, must be array');
    this.records = records;
    this.length = this.records.length || 0;
    this.model = classObject;
    this.records.forEach(r=>{
      if(typeof r === 'object'){

      }
    })
  }
  
  //This can be extended to support ordering, or custom query parameters for the underlying
  //associated models, or whatever else you might need
  async get(indexOrOptions){
    let records = await this.model.where(this.records);
    for(let i=0; i<this.length; i++){
      //you can probably just assume the order here
      this[i] = records.find(r=>r.id == this[i]);
    }
    this.populated = true;
    return this;
  }

  async save(){
    for(let i=0; i<this.length; i++){
      if(this[i].id){
        //assume its a populated record
        this[i].save();
      }
    }
  }

  async delete(){
    return await this.model.delete(this.records);
  }
}

module.exports = Association;