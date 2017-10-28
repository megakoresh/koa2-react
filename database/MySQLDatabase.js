const Database = require('./Database');
const mysql = require('mysql2/promise');
const { Utils, Logger } = require('common');

const CONNECTIONS = {};
const queryOptions = {
  //nestTables: true
}

//Wrapper around the query construction string, that does some validations and provides a consistent interface for simple queries
//if more advanced functionality is needed, I recommend using something like Knex
class SQLQuery {
  constructor(table, pk){
    if(!table) throw new Error('Table must be given to query constructor');    
    this.table = table;
    this.pk = pk || 'id';
    this.query = [];
    this.params = [];
  }

  get expectedParams(){
    let matches = this.toString().match(/\?{1,2}/gmi);
    return matches ? matches.length : 0;
  }

  static _objectToClause(obj){
    const compound = { clause: [], values: [] };
    for(let [key, val] of Utils.iterateObject(obj)){
      compound.clause.push(`${key} = ?`);
      compound.values.push(val);
    }
    return compound;    
  }

  where(clause){
    if(this.query.length === 0) this.query.push(`SELECT * FROM ${this.table}`);
    if(!clause) return this;

    this.query.push('WHERE\n');
    if(Utils.legitObject(clause)){
      let compound = SQLQuery._objectToClause(clause);
      this.query.push(compound.clause.join(' AND '));
      this.values(...compound.values);
    } else if(Array.isArray(clause) && clause.every(sub=>Utils.legitObject(sub))) { 
      const allCriteria = clause.map(sub => {
        let compound = SQLQuery._objectToClause(sub);
        return { clause: `(${compound.clause.join(' AND ')})`, values: compound.values };
      })
      this.query.push(allCriteria.map(cc=>cc.clause).join(' OR '));
      this.values(...allCriteria.reduce((acc, curr) => acc.concat(curr.values), []));
    } else if(typeof clause === 'string' || Number.isInteger(clause)) {
      if(typeof clause === 'string') this.query.push(clause); 
      else this.query.push(`${this.pk} = ${clause}`);
    } else {
      throw new Error('Clause of where statement must be an object, an array of objects, as string or an integer row id')
    }
    return this;
  }

  insert(clause){
    if(this.query.length !== 0) throw new Error(`Insert query must begin with insert clause, but something else was called before: ${this.query.join(' ')}`);    
    this.query.push(`INSERT INTO ${this.table}\n`);    
    this.query.push(clause);
    return this;
  }

  join(clause){
    if(this.query.length === 0) throw new Error('Query can not begin with a join statement');
    this.query.push(clause);
    return this;
  }
  
  update(clause){
    if(this.query.length !== 0) throw new Error(`Update queries must begin with update clause, but something else was called before: ${this.query.join(' ')}`);
    this.query.push(`UPDATE ${this.table}\n`);
    this.query.push(clause);
    return this;  
  }

  delete(){
    if(this.query.length !== 0) throw new Error(`Delete queries must begin with delete clause, but something else was called before: ${this.query.join(' ')}`);
    this.query.push(`DELETE FROM ${this.table}\n`);
    return this;
  }

  count(){
    if(this.query.length !== 0) throw new Error(`Count queries must begin with count clause, but something else was called before: ${this.query.join(' ')}`);
    this.query.push(`SELECT COUNT(*) as count FROM ${this.table}\n`);
    return this;
  }
  
  values(...values){
    if(this.expectedParams !== this.params.length + values.length) throw new Error(`Query so far does not support this number of parameters:\nexpected: ${this.expectedParams}\ngot: ${this.params.length + values.length}\nquery to far:\n${this.toString()}`);
    for(let value of values){
      if(Utils.legitObject(value)){
        if(Object.keys(value).some(key=>key.startsWith('_'))){
          let keysToDelete = Object.keys(value).filter(key=>key.startsWith('_'));
          for(let key of keysToDelete){
            delete value[key];
          }
        }
      }
    }
    this.params.push(...values);
    return this;
  }

  toString(){    
    return this.query.join(' ');
  }

  prepare(options){
    if(this.params.length === 0){ 
      return [this.toString()]; 
    }
    const final = this.toString();     
    if(this.expectedParams !== this.params.length) throw new Error(`Number of parameters(${this.params.length}) did not match the number of placeholders in the prepared query(${placeholders.length})!`);    
    return [ Object.assign({ sql: final }, options), this.params ];
  }  
}

module.exports =
class MySQLDatabase extends Database {
  constructor(url) {
    super(url, mysql);
  }

  static get SQLQuery() { 
    return SQLQuery;
  }

  //TODO:
  //strict mode - operate exactly with data provided, let mysql throw on schema errors. Also throw instead of just printing an error message in each method when result count is unexpected
  //relaxed mode - simply ignore (filter out) all fields that the table doesn't have and operate with reduced valid dataset(requires 1 extra query to fetch columns)
  async execute(...queries) {
    if(!queries.every(q=>q instanceof SQLQuery)) throw new Error('All queries must be instances of SQLQuery object');
    const autoRelease = !this.connection;
    const connection = await this.connect();   
    
    const executing = [];
    for(let query of queries){
      //Logger.verbose(`Executing\n${query.toString()}\nwith ${query.params.length} parameters`);
      executing.push(connection.query(...query.prepare()));
    }
    let result = await Promise.all(executing);
    if (autoRelease) connection.release();
    return queries.length === 1 ? result[0] : result;
  }
  
  async select(table, where, ...params) {
    const query = new SQLQuery(table).where(where).values(...params);
    const results = await this.execute(query);
    return results;
  }

  async insert(table, ...data) {
    if(data.length === 0) throw new Error('Tried to insert empty dataset (no second argument on insert)');
    if(data.length === 1 && Array.isArray(data[0])) data = data[0];
    let queries = [];
    let clause = 'SET ?';
    if(typeof data[0] === 'string') {
      clause = data[0];
      data = data.slice(1);
    }
    for(let row of data){
      if(!Utils.legitObject(row) && !Array.isArray(row)) throw new TypeError(`One of objects to insert passed to db.insert method was not a serializable data object: ${row}`);
      queries.push(new SQLQuery(table).insert(clause).values(row));
    }
    const results = await this.execute(...queries);
    return results;
  }

  async update(table, data, where, ...params) {    
    const query = new SQLQuery(table).update('SET ?').values(data).where(where);
    if(params) query.values(...params);
    const results = await this.execute(query);
    return results;
  }

  async updateMultiple(table, data, whereFn){
    if(!Array.isArray(data)) throw new Error('updateMultiple can only accept arrays of objects to update');
    if(typeof whereFn !== 'function') throw new Error('whereFn must be a function that sets the where condition for each record');    
    const queries = data
      .map((dd, index)=>{
        let finalQuery = whereFn(new SQLQuery(table).update('SET ?').values(dd), dd, index);
        if(!(finalQuery instanceof SQLQuery)) throw new Error(`whereFn must set the where clause of the query object and return it. Returned instead ${finalQuery}`);
        return finalQuery;
      });    
    const results = await this.execute(...queries);
    if(results.length !== data.length) Logger.error(`Results length on updateEach did not match the object count of ${data.length}, likely an error has occurred!`);
    return results;
  }

  async delete(table, where, ...params) {
    const query = new SQLQuery(table).delete().where(where).values(...params);
    const results = await this.execute(query);    
    return results;
  }

  async count(table, where, ...params) {
    const query = new SQLQuery(table).count();
    if(where) query.where(where);
    if(params) query.values(...params);
    const results = await this.execute(query);
    return results[0][0].count;
  }

  async connect() {
    if(this.dead) throw new Error(`This instance of MySQLDatabase was cloned for a transaction and is now dead, please use original`);
    if(this.connection) return this.connection;
    if (!CONNECTIONS[this.url]) {
      let pool = mysql.createPool(this.url+'?multipleStatements=true&connectionLimit=100'); //to debug add &debug=[\'ComQueryPacket\'] to the url
      //let pool = mysql.createPool(this.url+'?multipleStatements=true&connectionLimit=100&debug=[\'ComQueryPacket\']'); //to debug add &debug=[\'ComQueryPacket\'] to the url
      CONNECTIONS[this.url] = pool;
    }
    return await CONNECTIONS[this.url].getConnection();
  }

  async disconnect() {
    for (let [name, pool] of Utils.iterateObject(CONNECTIONS)) {
      Logger.info(`Closing ${name}`);
      await pool.end();
    }
  }

  /**
   * This function must contain all operations performed during the transaction. The transaction will be automatically commited if no errors occurred, or rolled back if any do.
   * @callback MySQLDatabase~transactionCallback
   * @param {MySQLDatabase} db temporary database instance to use during transaction (a copy of the one used to launch transaction)
   * @param {mysql.Connection} connection the connection object from mysql2 driver that will perform the transaction, equal to db.connection
   * @returns {Promise} promise that resolves when all transaction operations have completed. You may throw or return a rejected promise to trigger rollback
   */

  /**
   * Runs operations defined in the provided function callback in a transaction and commits it automatically, or rolls it back on any error
   * @param {MySQLDatabase~transactionCallback} transaction function that runs operations in transaction and returns a promise that resolves/rejects when the transaction is complete/failed
   * @returns {Promise<Array>} promise that resolves to a two-value array, where array[0] is what your transactionCallback returned, or null and array[1] is an error if any occurred.
   */
  transaction(transaction){
    if(typeof transaction !== 'function') return Promise.reject(new TypeError('Transaction takes a promise-returning function.'));
    const transactionInstance = new MySQLDatabase(this.url);
    return transactionInstance.connect()
      .then(connection=>{
        return connection.beginTransaction()
          .then(()=>transactionInstance.connection = connection)
          .then(()=>{
            let promise = transaction(transactionInstance, connection);
            if(typeof promise.then !== 'function'){
              throw new Error('Transaction callback must return a promise!');
            }
            return promise;
          })
          //propagate the result of user's callback to the end of chain
          .then((result)=>connection.commit().then(()=>[result, null]))
          .catch((err)=>{
            connection.rollback();
            Logger.error(`Rolled back transaction due to error:\n    ${err.stack}`);
            return [null, err];
          })
          //finally - release connection and mark the cloned instance used
          .then((result)=>{
            transactionInstance.connection.release();
            transactionInstance.connection = null;
            transactionInstance.dead = true;
            return result;
          });
      });      
  }
}