const { expect } = require('chai');
const { Utils, Logger } = require('common');
const { MariaDatabase } = require('database');

const db = new MariaDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}:3306/test`));

const joinTable = 'join_products_warehouses';

const products = [
  { 
    name: 'Thunder Socks', 
    description: 'The socks of Power™',
    price: 5.55
  },
  { 
    name: 'Lightsaber', 
    description: 'Any Lightsaber > The One True Ring',
    price: 3400.00
  },
  { 
    name: 'Koreshluck', 
    description: 'The power to always fail even with 99% chance of success',
    price: 0.00
  }
];

const warehouses = [
  {
    address: 'Testikylä 6',
    info: 'Ihan sopiva osoite, eikö?'
  },
  {
    address: 'Улица Страстного Десанта 69',
    info: 'Все дамы обожают это место'
  },
  {
    address: 'Exception Square 5',
    info: 'Can\'t seem to find a way off it'
  }
];

describe('MariaDatabase tests', async function () {
  it('Tests that connection works', async function () {
    const connection = await db.connect();
    connection.release();
  });
  it('Inserts data', async function () {
    let [insertResult, err] = await db.insert('products', products[0]);
    //first at least see if the actual operation completes without exceptions lel
    expect(insertResult.insertId > 0).to.be.true;
    //insert other products
    let moreInserts = await db.insert('products', products.slice(1));
    expect(moreInserts.length === 2 && moreInserts.every(result=>result[0].insertId>insertResult.insertId)).to.be.true;
  });
  it('Selects data', async function () {
    let products = await db.select('products', 'name LIKE ?', '%saber%');
    expect(!products).to.be.false;
    let [products1, fields] = await db.select('products', { id: 2 });
    expect(products1.length === 1).to.be.true;
    let [products2, fields2] = await db.select('products', { id: 2, name: 'nothing' });
    expect(products2.length).to.equal(0);
  });
  it('Updates data', async function () {
    let result = await db.update('products', { description: '100% legit updated description' }, 'name LIKE ?', '%saber%');
    expect(result);    
  });
  it('Selects updated data', async function () {
    let [updated, fields] = await db.select('products', 'description LIKE ?', '%legit%');
    expect(updated[0].name).to.equal(products[1].name);
  });
  it('Updates multiple rows', async function () {
    let result = await db.updateMultiple('products', [
      { 
        description: 'This really is a fascinating description' 
      },
      {
        description: 'Another fascinating description'
      }
    ], (query, updateObj, index)=>{
      if(index === 0) return query.where('name = ?').values('Thunder Socks');
      else return query.where('description LIKE ?').values('%fail%');
    });    
    expect(result);
    let records = await db.select('products', 'description LIKE ?', '%fascinating%');
    expect(records.length).to.equal(2);
  });
  it('Deletes data', async function () {
    let [result] = await db.delete('products', 'price < ?', 5); //deletes Koreshluck
    expect(result.affectedRows).to.equal(1);
    let [result1] = await db.delete('products', products.slice(0, products.length-1).map(product=>({name:product.name, price:product.price}))); //deletes the other two by direct property match, excluding description because it was updated above
    expect(result1.affectedRows).to.equal(2);
    let count = await db.count('products');
    expect(count).to.equal(0);
  });
  it('Inserts using multiple statements', async function () {
    let productsInserted = await db.insert('products', products);
    expect(productsInserted);
    let warehousesInserted = await db.insert('warehouses', warehouses);
    expect(warehousesInserted);
  });
  it('Performs a transaction', async function () {
    let [data, fields] = await db.select('warehouses', 'info LIKE ?', '%дамы%');
    let id = data[0].id;
    let transaction = db.transaction(async function (db, connection) {      
      await db.update('warehouses', { address: 'Улица Страстного Десанта 42' }, { id });
      [data, fields] = await db.select('warehouses', 'info LIKE ?', '%дамы%');      
      expect(data[0].address).to.equal('Улица Страстного Десанта 42');
      await new Promise((yes, no)=>setTimeout(()=>yes(), 1200)); //delay before committing
      return data[0];
    });    
    [data, fields] = await db.select('warehouses', id);    
    expect(data[0].address).to.equal(warehouses[1].address);
    let [results, err] = await transaction;
    expect(!err);
    expect(results !== null);
    [data, fields] = await db.select('warehouses', 'id = ?', id);
    expect(data[0].address).to.equal('Улица Страстного Десанта 42');
  });
  it('Performs transactions containing mutiple statements for insert, update, select and delete', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {
      let [products, fields] = await db.select('products');
      expect(products.length).to.equal(3);
      let productIds = products.map(p=>p.id);
      let [warehouses, fields1] = await db.select('warehouses');
      expect(warehouses.length).to.equal(3);
      let warehouseIds = warehouses.map(w=>w.id);
      let joins = productIds.map(pid=>({
        product_id: pid,
        warehouse_id: Utils.selectRandom(warehouseIds),
        quantity: Math.round(Utils.random(1, 1000))
      }));
      let [insertResults, err] = await db.insert(joinTable, joins);
      expect(insertResults);
      let moreRandomEntriesLOLOLOL = Utils.generateArray(Math.round(Utils.random(1,10)), (i)=>[Utils.selectRandom(productIds), Utils.selectRandom(warehouseIds), Math.round(Utils.random(1,1000))]);      
      await db.insert(joinTable, '(product_id, warehouse_id, quantity) VALUES(?)', ...moreRandomEntriesLOLOLOL);
      let [allJoins] = await db.select(joinTable);
      expect(allJoins.length).to.equal(joins.length+moreRandomEntriesLOLOLOL.length);
      await db.delete(joinTable, 'warehouse_id IN (?)', [Utils.selectRandom(warehouseIds)]);
    });
    let cleanupTransaction = await db.transaction(async function(db, connection){
      await connection.query(`ALTER IGNORE TABLE ${joinTable} ADD UNIQUE temp (product_id, warehouse_id)`);
      await connection.query(`ALTER TABLE ${joinTable} DROP INDEX temp`);
    });
    let count = await db.count(joinTable);
    expect(count > 0).to.be.true;
  });
  it('Performs two transactions in parallel', async function () {
    let connection = await db.connect();
    let cQuery = `SELECT COUNT(*) AS count FROM ${joinTable} INNER JOIN products ON products.id = ${joinTable}.product_id AND products.name LIKE '%Socks%';`;
    let intiailCount = (await connection.query(cQuery))[0][0].count;
    async function transaction1(db, connection) {
      //purchases every item in stock from all warehouses
      let [product, fields] = await db.select('products', 'name LIKE ?', '%Socks%');
      let [warehouses] = await db.select('warehouses');
      expect(warehouses.length).to.equal(3);      
      expect(product.length).to.equal(1);
      await db.delete(joinTable, 'product_id = ? AND warehouse_id IN (?)', product[0].id, warehouses.map(w=>w.id));
      return product[0];
    }
    async function transaction2(db, connection) {
      //adds a stock
      let [product, fields] = await db.select('products', 'name LIKE ?', '%Socks%'); //should run before the above is commited
      let [warehouses] = await db.select('warehouses');
      expect(warehouses.length).to.equal(3);      
      expect(product.length).to.equal(1);
      await db.insert(joinTable, '(product_id, warehouse_id, quantity) VALUES(?)', [product[0].id, Utils.selectRandom(warehouses).id, Math.round(Utils.random(1,1000))]);
      return product[0];
    }
    let results = await Promise.all([db.transaction(transaction1), db.transaction(transaction2)]);
    //should now have a different count, less than before
    let afterCount = (await connection.query(cQuery))[0][0].count;
    expect(afterCount<intiailCount).to.be.true;
  });
  it('Fails a transaction', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {
      await db.insert('products', { name: 'Oopsy daisy', description: 'This is not supposed to be in here' });
      throw new Error('Controlled error');
    });
    let [nope, err] = await db.select('products', 'name LIKE ?', 'Oopsy%');
    expect(nope.length).to.equal(0);
  });
  it('Fails a transaction fully contained within an outer try..catch', async function () {
    let threw = false;
    try {
      let transactionResult = await db.transaction(async function (db, connection) {
        await db.insert('products', { name: 'Oopsy daisy', description: 'This is not supposed to be in here' });
        throw new Error('Expected error');
      });
      let [nope, err] = await db.select('products', 'name LIKE ?', 'Oopsy%');
      expect(nope.length).to.equal(1); //should throw
    } catch (err) {
      Logger.info(`Failed with ${err.message}`);
      threw = err.message.includes('AssertionError');
    }
    expect(threw);
  });
});
