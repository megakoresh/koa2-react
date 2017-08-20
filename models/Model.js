//Abstract class defining how models should look like
class Model {  
  constructor(data){    
    this.id = data.id;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async find(query, db, collectionName){
    throw new Error('Model.find is abstract and must be implemented by subclasses');    
  }

  static async where(query, db, collectionName) {
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
}

/*
make sure to ALWAYS clean up open connections when app dies. On windows versions <10 SIGINT is not sent, you need to use
this method if running on Windows Server <2012 or Windows <10: 
const readLine = require('readline');
if (process.platform === 'win32') {
  const rl = readLine.createInterface({input: process.stdin, output: process.stdout});
  rl.on('SIGINT', () => {
    process.emit("SIGINT");
  });
}
this will backport SIGINT to the process, after which your callback should run fine
*/

process.on('SIGINT', Model.cleanUp);

module.exports = Model;