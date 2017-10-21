const { expect } = require('chai');
const { Utils, Logger } = require('common');
const { MySQLDatabase } = require('database');

const db = new MySQLDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}/test`));

const products = [
  { 
    name: 'Thunder Socks', 
    description: 'The socks of Power™' 
  },
  { 
    name: 'Lightsaber', 
    description: 'Any Lightsaber > The One True Ring' 
  },
  { 
    name: 'Koreshluck', 
    description: 'The power to always fail even with 99% chance of success' 
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
  });
  it('Selects data', async function () {

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
      Logger.info(`Failed with an ${err.message}`);
    }
  });
});

after(async function () {
  const connection = await db.connect();
  const [tables] = await connection.query('SHOW TABLES');
  const truncate = [];
  for (let tableData of tables) {
    for (let tableName of Object.values(tableData)) {
      Logger.info('Cleanup: Truncating ' + tableName);
      truncate.push(connection.query(`TRUNCATE TABLE ${tableName};`));
    }
  }
  await Promise.all(truncate);
  connection.release();
})