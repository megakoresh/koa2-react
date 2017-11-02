const { Logger } = require('common');

/**
 * This is your database wrapper. Your models use this as a standardized interface to your database driver
 * which lets you change databases easily as well as have a cleaner codebase.
 * 
 * If you use some kind of ORM like Sequelize or Mongoose, this class is recommended as an injection
 * for those - simply use the ORM instead of the database driver. I recommend subclassing database to
 * e.g. SequelizeDatabase and implementing the methods listed as wrappers around corresponding Sequelize
 * methods. For example connect() would then return result of new Sequelize('database', 'username', 'password').
 * 
 * Your model should then provide the result of ORMs schema which the query methods like find and where should accept. 
 * Or just ignore what I said and make your own implementation.
 */
module.exports = 
class Database {
  constructor(url){
    this.url = url;
    this.listerners();
  }

  listerners(){
    process.on('exit', this.disconnect);
    process.on('SIGINT', this.disconnect);    
    process.on('SIGUSR1', this.disconnect);
    process.on('SIGUSR2', this.disconnect);    
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

  /**
   * Connects to the database. When overriding this method DO NOT EVER perform a connection or any
   * async or long-running operation because if you follow conventions of the template, this method
   * will be called on EVERY database operation. So cache the database instance in the pool once the
   * first connection is performed and simply retreive the reference by some identifier (conventionally db url)
   * when this method is called subsequently.
   * @param {*} args arguments your overridden method will need, this will be same as what you pass to ensureConnected() in find, where, etc. Conventionally this is database url or table/collection name
   * @returns {*} database object from your db driver that represents a connected database instance
   */
  async connect(args){
    throw new Error('Database.connect is abstract and must be implemented by subclasses');
  }

  //free up a connection using the provided driver
  async disconnect(){
    throw new Error('Database.disconnect is abstract and must be implemented by subclasses');
  }
}