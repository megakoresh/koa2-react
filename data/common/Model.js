//Abstract class defining how models should look like
//You can test whether another model extends it using
//if(user instanceof Model) OR
//if(User.prototype instanceof Model) if you don't want to spawn instances
module.exports = 
class Model {  
  constructor(data){}

  deserialize(data){
    this.id = data.id; //default ID handling, will be overridden by most subclasses, I suppose
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
  
  serialize(){    
    //default timestamps. For mariadb you can
    //omit calling the super function, if you use
    //TIMESTAMP as default value for updatedAt field and
    //a macro for createdAt
    if(!this.createdAt){
      this.createdAt = new Date();      
    }
    return {
      createdAt: this.createdAt,
      updatedAt: new Date()
    }
  }

  static async count(){
    throw new Error('Model.count is abstract and must be implemented by subclasses');    
  }

  static async find(){
    throw new Error('Model.find is abstract and must be implemented by subclasses');    
  }

  static async where() {
    throw new Error('Model.where is abstract and must be implemented by subclasses');    
  }

  static async delete(){
    throw new Error('Static Model.delete is abstract and must be implemented by subclasses');
  }

  static async update(){
    throw new Error('Model.update is abstract and must be implemented by subclasses');
  }

  async get(){
    throw new Error('Model.get is abstract and must be implemented by subclasses');
  }

  async save(){
    throw new Error('Model.save is abstract and must be implemented by subclasses');
  }

  async delete(){
    throw new Error('Model.delete is abstract and must be implemented by subclasses');
  }

  toJSON(){
    return this.serialize();
  }
}