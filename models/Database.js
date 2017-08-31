/**
 * Abstract class for database objects
 * If you want to take it a step further, you can, instead of executing operations
 * instantly instead que them up - i.e. store an array of some kind of intermediate objects
 * representing the operations(i.e. queries) and then execute that whole array e.g. on timer or using
 * db.performTransaction() action. It should be rather easy because transactions only
 * work in SQL databases so your "intermediate objects" would quite literally just be
 * an array of strings with the first one being BEGIN TRANSACTION and last COMMIT TRANSACTION
 */
class Database {
  constructor(url, driver){
    this.url = url;
    this.driver = driver;
    this.db;

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

    process.on('SIGINT', this.disconnect);
  }

  async ensureConnected(tableName){
    if(!this.db) await this.connect(tableName);
  }

  //return some kind of result set from the query object passed
  async select(query){
    throw new Error('Database.select is abstract and must be implemented by subclasses');
  }

  //insert records using the query and return something
  async insert(query){
    throw new Error('Database.insert is abstract and must be implemented by subclasses');
  }

  //update records using the query and return something
  async update(query){
    throw new Error('Database.update is abstract and must be implemented by subclasses');
  }

  //delete records using the query and return something
  async delete(args){
    throw new Error('Database.delete is abstract and must be implemented by subclasses');
  }

  async count(args){
    throw new Error('Database.count is abstract and must be implemented by subclasses');
  }

  //set this.db to a database instance of the provided driver
  async connect(){
    throw new Error('Database.connect is abstract and must be implemented by subclasses');
  }

  //free up a connection using the provided driver
  async disconnect(){
    throw new Error('Database.disconnect is abstract and must be implemented by subclasses');
  }

  async beginTransaction(){
    throw new Error('Database.beginTransaction is abstract and must be implemented by subclasses');
  }

  async commitTransaction(){
    throw new Error('Database.commitTransaction is abstract and must be implemented by subclasses');
  }

  //get database instance
  getDb(){
    return this.db;
  }
}

module.exports = Database;