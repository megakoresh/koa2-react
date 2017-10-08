const Utils = require('utils');

/**
 * Abstract class to be overridden by other models.
 */
class Model {
  constructor(data){
    return this.deserialize(data);
  }

  /**
   * Obtain a reference to the Model's database connection
   * @returns {Database} database instance for the model
   */
  static get DB(){
    throw new Error(`DB getter is abstract and must be implemented by subclasses`);
  }
  /**
   * Change a model's database connection. Not all models need to support this. Useful for testing and scaling.
   * @param {Database} newdb Database that all database records will use from the moment of invoking this function
   */
  static set DB(newdb){
    throw new Error(`${Utils.getCurrentClassName(this)} does not support switching databases`);
  }

  /**
   * Implemented by subclasses to begin transaction.
   * Non-SQL subclasses can ignore this method
   * @return {Promise} something indicating that transaction has started
   */
  static async startTransaction(){
    
  }

  /**
   * Implemented by subclasses to commit transaction.
   * Non-SQL subclasses can ignore this method
   * @return {Promise} something indicating that transaction has been successfully commited
   */
  static async commitTransaction(){

  }

  /**
   * Implemented by subclasses to rollback transaction.
   * Non-SQL subclasses can ignore this method
   * @return {Promise} something indicating that transaction has been successfully rolled back
   */
  static async rollbackTransaction(){

  }

  /**
   * Returns the number of records of this model in the currently connected database
   * @returns {Number} number of records in this database
   */
  static async count(){
    throw new Error('Model.count is abstract and must be implemented by subclasses');    
  }

  /**
   * Find a single record with the provided query. Subclasses determine which parameters this accepts.
   * @returns {Model} instance of subclass
   */
  static async find(){
    throw new Error('Model.find is abstract and must be implemented by subclasses');    
  }

  /**
   * Find all arrays matching provided query. Subclasses determine which parameters this accepts.
   * @returns {[Model]} Array of subclass instances
   */
  static async where() {
    throw new Error('Model.where is abstract and must be implemented by subclasses');    
  }

  /**
   * Delete all records matching the provided query. Subclasses determine which parameters this accepts.
   * @returns {Number} amount of records deleted
   */
  static async delete(){
    throw new Error('Static Model.delete is abstract and must be implemented by subclasses');
  }

  /**
   * Updates all records matching the provided query. Subclasses determine which parameters this accepts.
   * @returns {Number} amount of records modified
   */
  static async update(){
    throw new Error('Model.update is abstract and must be implemented by subclasses');
  }

  /**
   * Updates the current record instance with information from the database
   * @returns {Model} the current instance, updated with the latest information, if available
   */
  async get(){
    throw new Error('Model.get is abstract and must be implemented by subclasses');
  }

  /**
   * Updates the database with the current instance's values or inserts a new record matching current instance.
   * @returns {Model} the current instance, updated with any database-generated values
   */
  async save(){
    throw new Error('Model.save is abstract and must be implemented by subclasses');
  }

  /**
   * Deletes the current instance's corresponding record in the database (if any)
   * @returns {Number} amount of records deleted (should be 1 or 0)
   */
  async delete(){
    throw new Error('Model.delete is abstract and must be implemented by subclasses');
  }

  /**
   * Retreives reference to the model instance's database object. Best practice is to return
   * Model.DB here
   * @returns {Database} database reference that this instance is using
   */
  get db(){
    throw new Error(`Model.db getter is abstract and must be implemented by subclasses`);
  }
  
  /**
   * Parses data returned from the Database instance of the model into the model instance properties
   * @param {JSON} data some data from the Database object to parse into the model's properties
   * @returns {Model} current instance, updated with the parsed properties
   */
  deserialize(data){
    this.id = data.id; //default ID handling, will be overridden by most subclasses, I suppose
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    //TODO: return new Proxy(this, this.validator());
    return this;
  }

  /*
  TODO: Use a Proxy for natively verifying model values (simply return the proxy from constructors of Models)
  /**
   * Returns a proxy handler object for this instance, that validates values immediately at the time of assignment.
   * Can be overridden by subclasses to provide custom model validation(e.g. against a schema). Default implementation prohibits dynamically
   * adding functions to model instances as well as other models directly without using Association class
   */
  /*
  validator(){
    return {
      set(target, property, value, receiver){
        if(value instanceof Model) throw new TypeError('Models can not contain other models as values, please use Association(ModelClass, value) instead');
        if(typeof value === 'function') throw new Error('Models do not support dynamic function properties');        
        target[property] = value;
        return true;
      },
      get(target, property, receiver){
        return target[property];
      }
    }
  }
  */
  
  /**
   * Serializes current instance's enumerable properties into an object understood by the Database instance.
   * Subclasses determine which parameters this accepts.
   * @returns {JSON} json object containing current instance's data to be put into database.
   */
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

  /**
   * Overrides default behaviour of Model instances when calling JSON.stringify(instance) on them
   * @returns {JSON} the JSON object to be strigified
   */
  toJSON(){
    return this.serialize();
  }
}

exports = Model;