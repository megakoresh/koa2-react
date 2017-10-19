const Database = require('./Database');
const mysql = require('mysql2');

class MySQLDatabase extends Database {
  constructor(url){
    super(url);
  }
}