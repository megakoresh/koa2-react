const MariaModel = require('./MariaModel');
const { MariaDatabase } = require('database');
const { Utils, Logger } = require('common');

let db = new MariaDatabase(encodeURI(`mysql://${process.env['MARIA_USER']}:${process.env['MARIA_PASSWORD']}@${process.env['MARIA_HOST']}/koa2_react`));
let tableName = 'products';

class Product extends MariaModel {
  constructor(data){
    super(data);
    this.deserialize(data);
  }

  get warehouses(){
    const query = new MariaDatabase.SQLQuery('join_products_warehouses')
      .join('INNER JOIN', Warehouse.DATASTORE, 'warehouse_id', 'id')
      .where(`product_id = ?`)
      .values(this.id);
    return Product.DB.connect()
      .then(connection=>connection.query(...query.prepare()))
      .then(results=>results[0].map(data=>new Warehouse(data[Warehouse.DATASTORE])));
  }

  deserialize(data){
    if(data.id && !isNaN(data.id)) this.id = data.id;
    for(let [key, value] of Utils.iterateObject(data)){
      switch(key){        
        case 'name':
        this.name = value;
        break;
        case 'price':
        this.price = Number.parseFloat(value);
        break;
        case 'description':
        this.description = value;
        break;
        //could probably throw on encountering unknown fields, but eh...
      }
    }
    return this;
  }

  serialize(id){
    const json = {
      name: this.name,
      price: this.price,
      description: this.description
    }
    if(id) json.id = this.id;
    return json;
  }

  static set DB(newdb) {
    if (newdb instanceof MariaDatabase) {
      Logger.warn(`Warning! Switching database for ${Utils.getObjectClassName(this)}! All records from now on will operate with ${newdb.url}`);
      db = newdb;
    } else {
      throw new TypeError(`This model only supports MariaDatabase type, was ${newdb.constructor.name}`);
    }
  }

  /**
   * @returns {MariaDatabase} database instance used by this model
   */
  static get DB() {
    return db;
  }

  static get DATASTORE() {
    return tableName;
  }

  get db() {
    return Product.DB;
  }

  get datastore() {
    return Product.DATASTORE;
  }
}

exports.model = Product;