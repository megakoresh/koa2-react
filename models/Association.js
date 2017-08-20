//If you have a many to many relationship, you will need to subclass this one to fetch
//results from a join table/collection before creating the instances of the associated
//object. Then you'll need to use that association subclass from all associated models
//Alternatively you can just create an extra model for this, e.g. MemesSites extends Model
//that would simply have two associations meme and sites, then have Assicuation to MemeSites
//from both Meme and Site models, so you could call await meme.sites.get() -> [ {meme: 1, site:2}, {meme:1, site:5} ]
//await memes.sites.map(async site=> await site.get()) -> [{url: 'https://mymemesite.com', id: 2}, ...]
class Association extends Array {
  constructor(classObject, ids){
    super();
    if(typeof classObject !== 'function') throw new Error(`Attempted to pass ${classObject} as an association class, but it's type was ${typeof classObject}`);
    if(!ids) throw new Error('Association invalid - id\'s were undefined');
    this.ids = ids;
    this.length = this.ids.length || 1;
    this.populated = false;
    this.model = classObject;
  }

  async get(){
    let records = await this.model.where(this.ids);
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
    return await this.model.delete(this.ids);
  }
}

module.exports = Association;