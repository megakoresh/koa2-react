const Database = require('./Database');
const mysql = require('mysql2/promise');
const { Utils, Logger } = require('common');

const CONNECTIONS = {};
const queryOptions = {
  nestTables: true
}

/*
db.select('users', 'id = ?', [21])
db.select('users', {id: 21});
db.select('users', 'id = 21 AND stuff = verySomehowComplicated');

  select(table, ...arguments)
    getSelectQueryComponent(arguments) => [ preparedQuerySegment, argumentsIfAny ]

db.insert('users', { name: 'Steve', avatar: 'http://minecraft.com/steve.jpg' });
db.insert('users', [{ name: 'Steve', avatar: 'http://minecraft.com/steve.jpg' }, {name: 'Paulina', avatar: 'https://facecrap.com/paulinaswag'}]);
db.insert('users', 'everything after INSERT INTO users');
  insert(table, ...arguments)
    getInsertQueryComponent(arguments) => [ [ preparedQuerySegment, argumentsIfAny ], [...] ]

db.update('users', insertArgs[], selectArgs[]);
  [whereQuery, whereArgs] = getSelectQueryComponent(selectArgs)
  [[]] = getInsertQueryComponent(insertArgs)


db.delete('users', ...arguments);
  [whereQuery, whereArgs] = getSelectQueryComponent(arguments)

constructFinalQuery(start, selectComponent, insertComponent)
  let finalQuery = [];
  if (insertComponent) {
    
  }
*/

/**
 * Since SQL queries include the table and everything,
 * this is essentially just a connection manager that
 * provides a consistent api and enforces a certain
 * code style for models using MariaDB database.
 * 
 * It contains helpers for common queries and provides a generic
 * query method to run any kind of query on the database connection.
 * 
 * TODO: really dirty query building, improve readability and reliability, 
 * split into separate testable methods.
 */
module.exports =
class MySQLDatabase extends Database {
  constructor(url) {
    super(url, mysql);
  }

  //create prepared query component(s) from arguments recursively
  //('SET id = 1, name = "memester"') -- raw query string
  //VALUES(?), [1, "memester"] -- 2 parameters of a single prepared statement
  //[ ['SET id = 1, name = "memester"'], [[VALUES(?)], [2, "swagster"]] ] -- array of arrays, each element one of these 3 possibilities
  constructQueryComponent(...args){
    if(args[0] === 'string'){
      switch(args.length){
        case 1:
          return [ [ args[0], [] ] ];
        case 2:
          return [ [ args[0], args[1] ] ];
        default:
          throw new Error('Unexpected input format');
      }
    }
    const insertComponent = [];
    for(let arg of args){
      insertComponent.push(this.constructQueryComponent.apply(this, arg));
    }
    return insertComponent;
  }

  constructFinalQuery(start, selectComponent, insertComponent){
    const finalQuery = [];    
    if(insertComponent && insertComponent.length !== 0){
      let [ whereStatement, whereParams ] = selectComponent ? selectComponent : ['', []];
      for(let insert of insertComponent){
        let [ modStatement, modParams ] = insert;
        let rowQuery = [ `${start} ${modStatement} ${whereStatement};`, modParams.concat(whereParams) ];
        finalQuery.push(rowQuery);
      }
    } else {
      //will throw on expansion if not provided
      let [ whereStatement, whereParams ] = selectComponent;
      finalQuery.push([`${start} ${whereStatement}`, whereParams]);
    }
    return finalQuery;
  }

  appendOptions(preparedQueries) {
    if(!Array.isArray(preparedQueries) || !preparedQueries.every(sub=>Array.isArray(sub))) throw new Error('Prepared queries must be an 2-dimensional array');
    for(let [index, query] of preparedQueries){
      let [statement, params] = query;
      preparedQueries[index][0] = Object.assign({ sql: statement }, queryOptions);
    }
  }

  //executes one or more prepared queries
  //argument must be an array in the form of [ [statement1, params1], [statement2, params2]... ] or [statement, params]
  async execute(preparedQueries) {
    if (typeof preparedQueries !== 'string') throw new TypeError('MySQLDatabase.query only supports strings as it\'s first arguments');
    preparedQueries = this.appendOptions(preparedQueries);
    
    const autoRelease = !this.connection;
    const connection = await this.connect();

    //it's called "silly" for a reason
    Logger.silly(`Executing ${preparedQueries.length} prepared quer${preparedQueries.length === 1 ? 'y' : 'ies'}`);

    if(preparedQueries.length === 1){
      const [statement, params] = preparedQueries;
      Logger.silly(`Executing prepared SQL statement: ${statement} with ${params.length} parameters`);
      [result, fields] = await connection.execute(statement, params);    
      if (autoRelease) connection.release();
      return [ [result, fields ] ];
    } else {
      const queries = [];
      let statement, params;
      for(let query of preparedQueries){
        [statement, params] = query;
        Logger.silly(`Executing prepared SQL statement: ${statement} with ${params.length} parameters`);
        queries.push(connection.execute(statement, params));
      }
      return await Promise.all(queries);
    }
  }

  async select(table, ...where) {    
    const prepared = this.constructFinalQuery(`SELECT * FROM ${table} WHERE `, this.constructQueryComponent(where), null);
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async insert(table, ...data) {    
    const prepared = this.constructFinalQuery(`INSERT INTO ${table} SET ?`, null, this.constructQueryComponent(data))
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async update(table, data, where) {
    const prepared = this.constructFinalQuery(`UPDATE ${table} SET ? WHERE `, this.constructQueryComponent(where), this.constructQueryComponent(data))
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async delete(table, ...where) {
    const prepared = this.constructFinalQuery(`DELETE FROM ${table} WHERE `, this.constructQueryComponent(where), null);
    const results = this.execute(prepared);
    if(results.length === 1) return results[0];
    else return results;
  }

  async count(table, ...where) {
    const prepared = this.constructFinalQuery(`SELECT COUNT(*) FROM ${table} WHERE `, this.constructQueryComponent(where), null);
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

  /* Usage:
  let [result, error] = await db.transaction(async function(tdb, connection){
    //everything inside this function is a transaction
    //if anything here throws transaction is automatically rolled back
    //if this runs to completion, transaction is automatically commited
    //if you catch errors without re-throwing, they will not be considered errors, and transaction will still be commited
    //if you catch the outer block, transaction will still be rolled back on error    
    await tdb.insert({some: 'data'}, 'myTable');
    await tdb.update({more: 'data'}, "memes = 'dank'", 'anotherTable');
    await connection.query('LOAD IN FILE "mydata.csv" INTO myTable');
    let query = ['BEGIN'];
    query.push('INSERT INTO bigTable(col1,col2,col3) VALUES (1,2,3);');
    //...    
    query.push('END;')
    await connection.query(query.join('\n'));
    //transaction NOT commited yet - data not yet available!
  });
  //transaction now commited or rolled back
  if(err) throw err;
  let data = await db.select('myData', 'some = data');
  data === RowDataPacket

  //connection === tdb.connection === mysql2.Connection, just for convenience. You can use it for
  //complex custom queries such as load in file, begin; end; multirow inserts and anything else that the driver supports.  
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
          .then((result)=>connection.commit().then(()=>result))
          .catch((err)=>{
            connection.rollback();
            Logger.error(`Rolled back transaction due to error: \n${err.message}`);
            return [null, err];
          })
          .finally((result)=>{
            transactionInstance.connection.release();
            transactionInstance.connection = null;
            transactionInstance.dead = true;
            return result;
          });
      });      
  }
}