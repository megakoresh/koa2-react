//Abstract class defining how models should look like
//You can test whether another model extends it using
//if(user instanceof Model) OR
//if(User.prototype instanceof Model) if you don't want to spawn instances
class Model {  
  constructor(data){    
    this.id = data.id;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async find(){
    throw new Error('Model.find is abstract and must be implemented by subclasses');    
  }

  static async where() {
    throw new Error('Model.where is abstract and must be implemented by subclasses');    
  }

  //get a datastore (table or collection) for a particular model
  static async datastore(){
    throw new Error('Model.datastore is abstract and must be implemented by subclasses');
  }

  static async delete(){
    throw new Error('Static Model.delete is abstract and must be implemented by subclasses');
  }

  static async update(){
    throw new Error('Model.update is abstract and must be implemented by subclasses');
  }

  async save(){
    throw new Error('Model.save is abstract and must be implemented by subclasses');
  }

  async delete(){
    throw new Error('Model.delete is abstract and must be implemented by subclasses');
  }

  serialize(){    
    if(!this.createdAt){
      this.createdAt = new Date();      
    }
    return {
      createdAt: this.createdAt,
      updatedAt: new Date()
    }
  }
}
module.exports = Model;