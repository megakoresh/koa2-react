const Model = require('./Model');
const { MySQLDatabase } = require('database');

const db = new MySQLDatabase(encodeURI(`mysql://${process.env['MARIA_USER']}:${process.env['MARIA_PASSWORD']}@${process.env['MARIA_HOST']}/koa2_react`));
const tableName = 'products';

class Product extends Model {
  constructor(data){
    super(data);
  }

  get warehouses(){
    Product.DB.select('join_products_warehouses', `product_id = ${this.id} INNER JOIN ${Warehouse.DATASTORE} ON (${Warehoise.DATASTORE}.id = join_products_warehouses.warehouse_id)`)
      .then(results=>results.map(res=>new Warehouse(res[0])));
  }

  deserialize(data){

  }

  serialize(){

  }

  static set DB(newdb) {
    if (newdb instanceof MySQLDatabase) {
      Logger.warn(`Warning! Switching database for ${Utils.getCurrentClassName(this)}! All records from now on will operate with ${newdb.url}`);
      db = newdb;
    } else {
      throw new TypeError(`This model only supports MySQLDatabase type, was ${newdb.constructor.name}`);
    }
  }

  /**
   * @returns {MySQLDatabase} database instance used by this model
   */
  static get DB() {
    return db;
  }

  static get DATASTORE() {
    return collectionName;
  }

  get db() {
    return Product.DB;
  }

  get datastore() {
    return Product.DATASTORE;
  }
}