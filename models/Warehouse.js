const MariaModel = require('./MariaModel');
const { MariaDatabase, DEF_MARIA } = require('database');
const { Utils, Logger, config } = require('common');

let db = DEF_MARIA;
let tableName = 'warehouses';

class Warehouse extends MariaModel {
  constructor(data){
    super(data);
    this.deserialize(data);
  }

  get products() {
    let query = new MariaDatabase.SQLQuery('join_products_warehouses');
    query.join('INNER JOIN', 'products', 'product_id', 'id').where(`warehouse_id = ${this.id}`);
    return this.db.connect().then(connection=>connection.query(query.toString()))
      .then(results=>results[0].map(data=>new Product(data)));
  }

  async quantity(product){
    let query = new MariaDatabase.SQLQuery('join_products_warehouses');    
    if(product instanceof Product) query.where(`warehouse_id = ${this.id} AND product_id = ${product.id}`);
    else if(typeof product === 'string') query.where(`warehouse_id = ${this.id}`).join('INNER JOIN', 'products', product);
    else if(typeof product === 'number') query.where(`warehouse_id = ${this.id} AND product_id = ${product}`);
    let connection = await this.db.connect();
    let [data] = await connection.query(query.toString());
    connection.release();
    let total = 0;
    for(let row of data){
      total += row.quantity; //should ideally not have more than one join entry per product/warehouse pair, but we didn't set up a composite index in migrations
    }
    return total;
  }

  /**
   * Adds products to the warehouse, creating new products if they don't exist. Creates join records in a transaction.
   * @param {Number|Function} quantity set or increase the quantity of the products by this value (or value returned by this parameter if its a function accepting product data)
   * @param {Product} products products to add or increase quantity of
   * @returns {Array} result of the transaction where first element is the result of transaction containing information on rows added or updated(an array), and second is an error if any occurred and transaction was rolled back
   */
  async add(quantity, ...products){
    //This is supposed to be an advanced example of functionality possible with the current APIs
    if(!quantity) throw new Error('Please specify quantity for products');
    if(!this.id) throw new Error('id property missing on the warehouse. It must be present in the database before adding products to it.');
    if(typeof quantity !== 'function' && typeof quantity !== 'number') throw new Error('Quantity must be a number applied to all products or a function that returns quantity for product data passed to it');
    if(typeof quantity === 'function' && typeof quantity(products[0]) !== 'number') throw new Error('Quantity was a function, but did not return a number during test run, instead returned '+quantity(products[0]));
    let save = []; 
    for(let product of products){
      if(!(product instanceof Product)) {
        Logger.warn(`Entry ${product} was not an instance of Product. Please instantiate before adding, so that the data can be validated. Skipping now`);
        continue;
      }
      if (!product.id) save.push(product.save());
    }
    await Promise.all(save);    
    const thisId = this.id;
    let transaction = await this.db.transaction(async function(db, connection){
      const joinTable = 'join_products_warehouses';
      const productIds = products.map(p=>p.id);
      let existing = [];
      if(productIds.length > 0) 
        [existing] = await db.select(joinTable, `product_id IN (?) AND warehouse_id = ?`, products.map(p=>p.id), thisId);
      const inserts = products.filter(p=>!existing.some(r=>r.product_id===p.id)).map(product=>({
        product_id: product.id,
        warehouse_id: thisId,
        quantity: typeof quantity === 'function' ? quantity(product) : quantity
      }));
      let results = await db.insert(joinTable, inserts);      
      if(existing.length>0){
        if(typeof quantity !== 'function' || typeof quantity(existing[0]) !== 'number') Logger.error(`${existing.length} records already exist in the database, but the passed in quantity function can not process raw join records. Please update these records manually.`)
        else {
          //updating some records instead of inserting new ones
          const updates = existing.map(r=>({quantity: typeof quantity === 'function' ? quantity(r) : quantity}));
          let updateResults = await db.updateMultiple(joinTable, updates, (query, record, index)=>query.where(`id = ${existing[index].id}`));
          results.push(...updateResults);
        }
      }
      return results;
    });
    return transaction;
  }

  async purchase(product, quantity){
    if(isNaN(quantity)) throw new Error('Quantity must be a number, was '+quantity);
    if(!(product instanceof Product)) throw new Error('Product must be an instance of the Product class to be purchased');
    if(!product.id) throw new Error('Product instance must have an id to be purchased');
    const self = this;
    let [data] = await this.db.select('join_products_warehouses', 'product_id = ? AND warehouse_id = ?', product.id, this.id);
    if(data.length === 0) throw new Error(`Product ${product.name} does not exist at ${this.address}`);
    if(data.length > 1) Logger.warn('Found more than 1 relation between product and warehouse, not ideal!');
    let relation = data[0];
    if(relation.quantity < quantity) throw new Error(`Not enough of ${product.name} at ${this.address} - requested ${quantity} but found only ${relation.quantity}`);
    const transaction = await this.db.transaction(async function(db, connection){
      let result;
      if(relation.quantity === quantity){
        result = await db.delete('id = ?', relation.id);
      } else {
        result = db.update('join_products_warehouses', { quantity: relation.quantity - quantity }, 'id = ?', relation.id)
      }
      return result;
    });    
    return transaction;
  }

  deserialize(data){
    if(data.id) this.id = data.id;
    for(let [key, value] of Utils.iterateObject(data)){
      switch(key){
        case 'address':        
        case 'info': 
          this[key] = value;        
          break;
      }
    }
  }

  serialize(id){
    const json = {
      address: this.address,
      info: this.info,
      quantity: this.quantity
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
    return Warehouse.DB;
  }

  get datastore() {
    return Warehouse.DATASTORE;
  }
}

exports.model = Warehouse;