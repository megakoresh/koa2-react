const Database = require('./Database');
const mysql = require('mysql2/promise');
const { Utils, Logger } = require('common');

const CONNECTIONS = {};
const queryOptions = {
  nestTables: true
}

/**
 * Simple wrapper around most common database interactions
 * which also provides a convenient and consistent transaction
 * api. Omitting some simple query building helpers, this
 * is essentially just a connection manager. Pools of connections
 * are stored in a static variable using db urls as keys. A connection
 * is fetched from appropriate pool by an instance when an operation
 * is performed and released back to the pool automatically except when in transaction.
 * 
 * In a transaction the db instance is temporarily cloned with a special connection where transaction was initiated.
 * Transaction function takes a function that must return a promise (e.g. async).
 * When transaction-related code throws or completes(reaches end of provided callback and resolves),
 * the transaction is automatically commited or rolled back, the temp instance is made unusable
 * and the connection is released back to the pool. That way transactions kind of follow the same
 * logical pattern as normal try..catch code blocks do - complete or recover on error:
 * 
 * let [result, err] = await db.transaction(async function(tdb, connection){
 *   //tdb - cloned db instance, original may still be used, but it will be outside of transaction using different connection
 *   //connection === tdb.connection the mysql2 connection used for this transaction. Only this connection's queries will be part of transaction. It will be commited/rolled back and release to pool automatically.
 *   let [result, fields] = await connection.query('INSERT INTO user (name, password, orgId) VALUES(?)', ['test', 'asdjhgjgv21233ebkhj', 1]);
 *   let [result1, fields] = await connection.query('INSERT INTO organizations (name, address) VALUES(?)', ['Dank Academy', 'Socrates Meme Square 10']);
 *   let [result2, fields] connection.query('INSERT INTO permissions (user, targetId, targetTable, mask) VALUES(?)', [result.insertId, result1.insertId, 'organizations', 777]);
 *   try {
 *     await connection.query('INSERT INTO logs SET message = `Added a new user and organization in one transaction. Given full rights of organization to the new user`');
 *   } catch(err){
 *     console.log('Adding logs failed, but it's not big enough problem to fail the transaction of it!);
 *   }
 *   return [result.insertId, result1.insertId, result2.insertId];
 * });
 * //we await-ed on transaction, so code below runs after it's commited (or rolled back)
 * if(err) throw err; //an outer try..catch will get this error, but transaction will still be rolled back, just like you'd expect
 * let [userId, orgId, permissionId] = result;
 * console.log('User and organization have been added and user was granted full rights on the organization');
 */
module.exports =
class MySQLDatabase extends Database {
  constructor(url) {
    super(url, mysql);
  }
  //should return an array containing "tuples", where the first argument is a prepared statement, and second is a set of parameters for it. For example
  //[ [ 'id = ? OR title LIKE %?%', [69, 'master'] ], [ '(?)', [ [1,2,3,4] ] ], [ '?', { hash: '0x34521', name: 'Uroboros' } ] ]
  //the prepared statement syntax follows mysqljs expansion rules. Every "tuple" will conform to a separate SQL query, and yield it's own set of results
  //this function is intended for use primarily inside this class, but you can use it as a helper for constructing prepared statement arguments as well
  constructQueryComponent(...args){
    if(typeof args[0] === 'string'){
      switch(args.length){
        case 1:
          return [ [ args[0], [] ] ];
        case 2:          
          return [ [ args[0], args[1] ] ];
        default:
          throw new Error('Unexpected input format');
      }
    } else if(args[0] instanceof Object && args[0].constructor === Object){
      return [ [ ' ? ', [ args[0] ] ] ];
    }
    const insertComponent = [];
    for(let arg of args){
      let statement = this.constructQueryComponent.apply(this, arg);
      insertComponent.push(...statement);
    }
    return insertComponent;
  }

  //returns an array of full query objects that all begin with 'start', and contains as many elements as there are 
  constructFinalQuery(start, selectComponent, insertComponent){
    const finalQuery = [];
    if(insertComponent && insertComponent.length !== 0){      
      let whereStatement, whereParams, modStatement, modParams;
      for(let i = 0; i < insertComponent.length; i++){
        [modStatement, modParams] = insertComponent[i];
        [whereStatement, whereParams] = selectComponent ? ( selectComponent[i] || selectComponent[0] ) : ['', []];
        let rowQuery = [ `${start} ${modStatement} ${whereStatement};`, modParams.concat(whereParams) ];
        finalQuery.push(rowQuery);
      }    
    } else if(!selectComponent){
      throw new TypeError('Select component must not be undefined when not insertComponent is present');
    } else if(Array.isArray(selectComponent[0])){
        for(let selectQuery of selectComponent){
          finalQuery.push(...this.constructFinalQuery.apply(this,[start, selectQuery]));
        }        
    } else if(typeof selectComponent[0] === 'string') {
      let [ whereStatement, whereParams ] = selectComponent;
      finalQuery.push([`${start} ${whereStatement}`, whereParams]);
    } else {
      throw new TypeError('Select component can either be an array of select statements (each for a separate query) or a single statement with a string as first element and array of parameters are the second');      
    }
    return finalQuery;
  }

  appendOptions(preparedQueries) {    
    for(let query of preparedQueries){      
      query[0] = Object.assign({ sql: query[0] }, queryOptions);
    }
    return preparedQueries;
  }

  //executes one or more prepared queries
  //argument must be an array in the form of [ [statement1, params1], [statement2, params2]... ] or [statement, params]
  //params may or may not be present, if omitted the query is treated like already escaped raw query, but at least an empty array must be passed
  async execute(preparedQueries) {
    if(!preparedQueries.every(q=>Array.isArray(q)) || !preparedQueries.every(q=>typeof q[0] === 'string'))
      throw new Error('Prepared query construction error: queries must be in the following form: \n [ [statement1, params1], [statement2, params2]... ] or [statement, params]')
    preparedQueries = this.appendOptions(preparedQueries);
    
    const autoRelease = !this.connection;
    const connection = await this.connect();

    //it's called "silly" for a reason
    Logger.silly(`Executing ${preparedQueries.length} prepared quer${preparedQueries.length === 1 ? 'y' : 'ies'}`);

    //NOTE: in mysql2 connection.execute is a proper mysql prepared statement - sends data using binary protocoles straight to server in a separate request, so
    //'javascriptey' emulation of prepared statements like e.g. expanding objects into key = value, ... lists isn't possible. Because the db class methods are simple
    //convenience for most commonly used primitive operations, we don't utilize it here for sake of simplicity. The code philosophy of this template encourages using
    //the .transaction api or directly obtaining a mysql2 connection with await db.connect() for anything more complex.

    //TL;DR: .query methods are NOT actual prepared statements - they simply escape the data property on *serverside* before sending plain queries.
    //Don't use it for binary data like images - use db.transaction(async function(db, conn){ await conn.execute('INSERT INTO binaryTable col = ?', [Buffer.from(imageData)]) });
    if(preparedQueries.length === 1){
      const [statement, params] = preparedQueries[0];
      Logger.silly(`Executing prepared SQL statement: ${statement} with ${params.length} parameters`);
      let [result, fields] = await connection.query(statement, params);
      if (autoRelease) connection.release();
      return [ [result, fields ] ];
    } else {
      const queries = [];
      let statement, params;
      for(let query of preparedQueries){
        [statement, params] = query;
        Logger.silly(`Executing prepared SQL statement: ${statement} with ${params.length} parameters`);
        queries.push(connection.query(statement, params));
      }
      let result = await Promise.all(queries);
      if (autoRelease) connection.release();
      return result;
    }
  }

  async select(table, ...where) {    
    const prepared = this.constructFinalQuery(`SELECT * FROM ${table} WHERE`, this.constructQueryComponent(where), null);
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async insert(table, ...data) {
    if(data.length === 0) throw new Error('Tried to insert empty dataset (no second argument on insert)');
    const prepared = this.constructFinalQuery(`INSERT INTO ${table} SET`, null, this.constructQueryComponent(data))
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async update(table, data, where) {
    const prepared = this.constructFinalQuery(`UPDATE ${table} `, this.constructQueryComponent('WHERE ',where), this.constructQueryComponent(data))
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async delete(table, ...where) {
    const prepared = this.constructFinalQuery(`DELETE FROM ${table} WHERE`, this.constructQueryComponent(where), null);
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async count(table, ...where) {
    const prepared = this.constructFinalQuery(`SELECT COUNT(*) FROM ${table} WHERE`, this.constructQueryComponent(where), null);
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async connect() {
    if(this.dead) throw new Error(`This instance of MySQLDatabase was cloned for a transaction and is now dead, please use original`);
    if(this.connection) return this.connection;
    if (!CONNECTIONS[this.url]) {
      let pool = mysql.createPool(this.url+'?multipleStatements=true&connectionLimit=100');
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
            Logger.error(`Rolled back transaction due to error: \n${err.message}`);
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