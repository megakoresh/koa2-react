const { expect } = require('chai');
const { Utils, Logger } = require('common');
const { MySQLDatabase } = require('database');

const db = new MySQLDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}:3306/test`));

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

describe('MySQLDatabase tests', async function () {
  it('Tests that connection works', async function () {
    const connection = await db.connect();
    connection.release();
  });
  it('Inserts data', async function () {
    let insertResult = await db.insert('products', products[0]);
    //first at least see if the actual operation completes without exceptions lel
    expect(insertResult[0][0].insertId > 0).to.be.true;
    //insert other products
    let moreInserts = await db.insert('products', products.splice(1, 0));
    expect(moreInserts.affectedRows === 2).to.be.true;
  });
  it('Selects data', async function () {
    let products = await db.select('product', 'name LIKE %?%',['saber']);
    expect(!products).to.be.false;
  });
  it('Updates data', async function () {

  });
  it('Selects updated data', async function () {

  });
  it('Deletes data', async function () {

  });
  it('Inserts using multiple statements', async function () {

  });
  it('Selects using mutiple statements', async function () {

  });
  it('Updates using multiple statements', async function () {

  });
  it('Deletes using multiple statements', async function () {

  });
  it('Performs a transaction', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {

    });
  });
  it('Performs a transaction containing mutiple statements for insert, update, select and delete', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {

    });
  });
  it('Performs a transaction in parallel with other operations using original db instance', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {

    });
  });
  it('Fails a transaction', async function () {
    let transactionResult = await db.transaction(async function (db, connection) {

    });
  });
  it('Fails a transaction fully contained within an outer try..catch', async function () {
    try {
      let transactionResult = await db.transaction(async function (db, connection) {

      });
      throw new Error('Controlled error');
    } catch (err) {
      Logger.info(`Failed with ${err.message}`);
    }
  });
});

after(async function () {
  const connection = await db.connect();
  const [tables] = await connection.query('SHOW TABLES');  
  const truncates = [];
  let query;
  for (let tableData of tables) {
    for (let tableName of Object.values(tableData)) {
      Logger.info('Cleanup: Truncating ' + tableName);
      query = `TRUNCATE ${tableName};`;
      if(tableName.startsWith('join')) truncates.splice(0,0,query);
      else truncates.push(query);
    }
  }
  truncates.splice(0,0,'SET FOREIGN_KEY_CHECKS = 0;');
  truncates.push('SET FOREIGN_KEY_CHECKS = 1;');
  await connection.query(truncates.join('\n'));
  connection.release();
})