const { Utils } = require('common');

const SYMBOL_KEY = 'modulesLoadedSymbolKey';
/**
 * Abstract class to be overridden by other models.
 * If you want to use an ORM like sequelize or Mongoose you probably don't need to even extend this (I still highly recommend to to keep
 * record-related logic in their own classes). If you only use one type of DB and use an ORM, simply replace the Errors here with the corresponding
 * ORM methods.
 * 
 * The recommended approach however is to extend this Model anyway and place the ORM methods to Database class.
 */
module.exports = class Model {
  constructor(data){
    if(!data) throw new Error('A model can not be constructed with no data, please provide at least something');
    if(!global[Model.MODELS_LOADED_FLAG]){
      throw new Error(`Models have not been loaded, please call require('models') once before executing any model code`);
    }
    //TODO: return proxy instead like in Association, to validate values on assignment    
    //return new Proxy(this, validator); //where validator is Child.VALIDATOR implementing Proxy.handler passed via constructor parameter
  }

  /**
   * Returns a symbol indicating that models have been loaded. Must be set to global object once that happens.
   */
  static get MODELS_LOADED_FLAG(){
    return Symbol.for(SYMBOL_KEY);
  }
  
  /**
   * Obtain a reference to the Model's database object. This should return a Database wrapper
   * which in turn maintains a pool of actual driver connections (or your ORM)
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
    throw new Error(`${Utils.getObjectClassName(this)} does not support switching databases`);
  }

  /**
   * Returns some identity of the datastore (table, collection, etc.) that your model uses in it's query methods
   * Typically this is your ORM's representation of a table or collection
   * e.g. result of sequelize.define('tableName', { shema }) or mongoose.model({ schema })
   * or, if not using an ORM, the name of a table or a collection, as a string
   * 
   * Recommended approach is to define this in your Model module as a "private" variable/field so it gets executed
   * once when the server starts and have your model's implementation of this method return a reference to that variable.
   * @returns {*} identity of the datastore
   */
  static get DATASTORE(){
    throw new Error(`Model.DATASTORE getter is abstract and must be implemented by subclasses`)
  }

  /**
   * Sets the datastore identity for your model (used to change table/collection name for all future operations).   
   * @param {*} newDatastore the new datastore identity your model will use from the time of setting this static variable
   */
  static set DATASTORE(newDatastore){
    throw new Error(`Model.DATASTORE setter is abstract and must be implemented by subclasses`)
  }

  // Allows parent logic to use child class's database instance, if returned from this method
  // via ChildModel.DB
  static get db(){
    throw new Error(`Model.db getter is abstract and must be implemented by subclasses`)
  }
  // Allows parent logic to use child class's datastore, if returned from this method
  // via ChildModel.datastore
  static get datastore(){
    throw new Error(`Model.datastore getter is abstract and must be implemented by subclasses`)
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

  [Symbol.toPrimitive](hint){
    if(hint !== 'number'){
      //Model: id = 1, field1 = someValue, field2 = another, okidoki = 1...
      return `${Utils.getObjectClassName(this)}: ${Object.keys(this).map(k=>`${k} = ${this[k]}`).join(', ').substring(0, 60)} ...`;
    }
    throw new TypeError(`${Utils.getObjectClassName(this)} can not be cast to number`);
  }
}