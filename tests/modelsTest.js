const { expect } = require('chai');
const { Utils, Logger } = require('common');
const { User, Comment, Product, Warehouse } = require('models');
const { MongoDatabase, MariaDatabase } = require('database');

const db = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_TEST_USER']}:${process.env['MONGO_TEST_PASS']}@${process.env['MONGO_TEST_HOST']}/testdb`));
const mdb = new MariaDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}:3306/test`));
//Change database to the test one
User.DB = db;
Comment.DB = db;
Product.DB = mdb;
Warehouse.DB = mdb;

describe('User model:', async function() {
  Logger.info(`Testing user model. Database ${User.DB.url} and collection ${User.DATASTORE}`);
  it('tests whether connection works', async function() {
    await User.where({username: 'nopestitynopes'}); //this will create the collection implicitly
    const count = await User.DB.connect().then(db=>db.collection(User.DATASTORE).count());
    expect(count).to.equal(0);
  });
  it('inserts a user into the database', async function(){
    let newUser = new User({username: 'engi', avatar: 'http://i0.kym-cdn.com/photos/images/newsfeed/000/820/444/f64.gif'});
    let inserted = await newUser.save();
    expect(inserted).to.be.an('object');
    expect(newUser.id).to.be.a('string');
  });
  it('inserts multiple users into the database', async function(){
    let newUsers = await User.insert([
      {
        username: 'bunny',
        avatar: 'http://3.bp.blogspot.com/-fGQcKmfH_hY/UgQb8T-A9WI/AAAAAAAAEwI/cT7SWjTiwg4/s1600/7+normal,+hapless.jpg'
      },
      {
        username: 'penny',
        avatar: 'https://i.ytimg.com/vi/HqkoWv-Jfto/maxresdefault.jpg'
      },
      {
        username: 'mrnode',
        avatar: 'https://www.mrnode.tk/tophatlogo%20(2).png'
      }
    ]);
    expect(newUsers).to.have.length(3);
  })
  it('updates users in the database', async function(){    
    let updatedCount = await User.update({username: 'penny'}, {favouriteWeapon: 'Jet Hammer'});
    expect(updatedCount).to.equal(1);    
    let mrNode = await User.find({username: 'mrnode'});
    expect(mrNode.id).to.be.a('string');
    mrNode.favouriteWeapon = 'v8';    
    let inserted = await mrNode.save();    
    expect(inserted).to.equal(false);
    mrNode = await User.find({favouriteWeapon: 'v8'});    
    expect(mrNode.favouriteWeapon).to.equal('v8');
    let penny = await User.find({username: 'penny'});
    expect(penny.favouriteWeapon).to.equal('Jet Hammer');
  })
  it('finds many users from the database', async function(){
    let usersWithAvatars = await User.where({avatar: { '$exists': true }});
    expect(usersWithAvatars).to.have.length(4);
  })
  it('cleans up all the users in the database', async function(){
    let allUsers = await User.where();
    expect(allUsers).to.have.length(4);
    await allUsers[0].delete(); //delete one using instance method
    let count = await User.count();
    expect(count).to.equal(3);
    let deletedCount = await User.delete({username: allUsers[1].username});//delete a user using static method
    expect(deletedCount).to.equal(1);    
    count = await User.count();
    expect(count).to.equal(2);
    await User.delete(); //delete the rest
    count = await User.count();
    expect(count).to.equal(0);   
  })
});
//Test associations between user and comment
describe('Comment:', function() {
  Logger.info(`Testing comment model. Database ${Comment.DB.url} and collection ${Comment.DATASTORE}`);
  it('tests whether connection works', async function() {    
    const count = await Comment.count();
    expect(count).to.equal(0);
  });
  it('posts a comment as a user', async function(){
    //create a user
    let user = new User({username: 'XxX_must4p4sk4_XxX'});
    let insered = await user.save();
    expect(insered).to.be.an('object');
    let commentsAdded = await user.addComments('I like trains');    
    let foundComment = await Comment.find({userId: user.id});
    expect(foundComment.text).to.equal(commentsAdded[0].text);
  });
  it('posts another comment as a user', async function(){
    let user = await User.find({username: 'XxX_must4p4sk4_XxX'});
    let commentsAdded = await user.addComments('N0sc0p3d bi4tch!');  
    let count = await Comment.count();
    expect(count).to.equal(2);
  })
  it('likes a comment', async function(){
    let user = await User.find({username: 'XxX_must4p4sk4_XxX'});
    let comment = (await user.comments)[0];
    let likes = Math.round(Math.random()*10)+1;
    comment.likes += likes;
    await comment.save();
    comment = await Comment.find(comment.id);
    expect(comment.likes).to.equal(likes);
  })
  it('updates an existing comment', async function(){
    let user = await User.find({username: 'XxX_must4p4sk4_XxX'});
    let comment = (await user.comments)[0];
    let text = 'Looks like I was really high that time...';
    comment.text = text;
    await comment.save();
    comment = await Comment.find(comment.id);
    expect(comment.text).to.equal(text);
  })
  it('cleans up all the comments in the database', async function(){
    let users = await User.where();    
    const toDelete = [];
    for(let i=0; i<users.length;i++){      
      toDelete.push(users[i].delete());
      toDelete.concat((await users[i].comments).map(comment=>comment.delete()));      
    }
    await Promise.all(toDelete);
    const count = await User.count();
    expect(count).to.equal(0);
    const commentCount = await Comment.count();
    expect(commentCount).to.equal(0);    
  })
});

describe('Tests product and warehouse models:', function(){
  it('adds products and warehouses to the database', async function(){
    let insert1 = await Product.insert({ name: 'Exquisite hat', description: 'It\'s a hat. It\'s exquisite. What else you want?', price: 1955.40 });
    expect(insert1[0].id);
    let insert2 = await Product.insert([
      {
        name: 'Chessboard',
        description: 'A vintage lunchbox',
        price: 300.0
      },
      {
        name: 'A bag of misery',
        description: 'Treat yourself(or your (un)loved ones) to some condensed misery in a bag. Comes with a free cyanide pill.',
        price: 666.66
      }
    ]);
    expect(insert2.every(r=>r.id));
    let chessboard = await Product.find(`name LIKE ?`, 'Chessboard');
    expect(chessboard.id).to.exist;
  });
  it('updates or creates products', async function(){
    await Product.update({ name: 'Box of cox' }, 'price > ? AND price < ?', 200, 400);
    let updated = await Product.find('name LIKE ?', '%cox');
    expect(updated.price).to.equal(300);
    let allProducts = await Product.where();
    allProducts.forEach(product=>product.price = 350);
    await Product.update(allProducts.map(product=>product.serialize(true)));
    allProducts = await Product.where();
    expect(allProducts.every(product=>product.price === 350)).to.be.true;
    let misery = allProducts.find(product=>product.name.includes('misery'));
    misery.price = 420.55;
    await misery.save();
    misery.price = -1;
    await misery.get();
    expect(misery.price === 420.55);
    let theJoj = new Product({ name: 'JOJ', description: 'You want it.', price: 9999.99 });
    await theJoj.save();
    expect(typeof theJoj.id === 'number');
  });
  it('searches products', async function(){
    let searched = await Product.where('name LIKE ? OR description LIKE ?', '%cox%', '%cyanide%');
    expect(searched.length).to.equal(2);
    searched = await Product.where('name = \'JOJ\' OR (price > ? AND price < ?)', 3000, 12000);
    expect(searched.length === 1);
  });
  it('deletes products', async function(){
    let lunchbox = await Product.find('description = ?', 'A vintage lunchbox');
    await lunchbox.delete();
    lunchbox.id = -1;
    await lunchbox.get();
    expect(lunchbox.id === -1);    
    await Product.delete('name = \'JOJ\' OR price < 420');
    let products = await Product.where();
    expect(products.length === 4);
  });
});

describe('Tests many to many relation between product and warehouse:', function(){
  it('obtains relation from both sides', async function(){
    let allProducts = await Product.where();
    for(let product of allProducts){
      let warehouses = await product.warehouses;
      expect(warehouses.length).to.be.a('number');      
      for(let warehouse of warehouses){
        let quantity = await warehouse.quantity(product);
        Logger.info(`There are ${(quantity)} of ${product.name} in a warehouse at ${warehouse.address}`);
      }
    }
    let allWarehouses = await Warehouse.where();
    for(let warehouse of allWarehouses){
      let products = await warehouse.products;
      expect(products.length).to.be.a('number');
      Logger.info(`There are ${products.length} products at ${warehouse.address}`);
    }
  });
  it('adds some quantity of random 3 products to a warehouse in 2 transactions', async function(){
    let allProducts = await Product.where();
    let randomProducts = [];
    for(let i = 0; i< allProducts.lenth>3 ? 3 : allProducts.length; i++){
      randomProducts.push(Utils.selectRandom(allProducts, true));
    }
    let warehouse = (await Warehouse.where())[0];
    let result = await warehouse.add(100, ...randomProducts);
    expect(result[0]);
    for(let product of randomProducts){
      let warehouses = await product.warehouses;
      for(let warehouse of warehouses){
        let quantity = await warehouse.quantity(product);
        expect(quantity).to.equal(100);
      }
    }
    randomProducts.splice(0,1);
    let result2 = await warehouse.add(50, ...randomProducts);
    for(let product of randomProducts){
      let warehouses = await product.warehouses;
      for(let warehouse of warehouses){
        let quantity = await warehouse.quantity(product);
        expect(quantity).to.equal(150);
      }
    }
  });
  //These kinds of operations should be abstracted behind appropriate model's methods,
  //but for sake of testing they are here now, after all - this is all boilerplate code
  it('gets the warehouses in which products exist', async function(){
    let connection = await Warehouse.DB.connect();
    const query = new MariaDatabase.SQLQuery('join_products_warehouses');
    query.join('INNER JOIN', 'warehouses', 'warehouse_id', 'id').where('quantity > 0');
    const [rows] = await connection.query({sql: query.toString(), nestTables: true});
    for(let textRow of rows){
      let warehouse = new Warehouse(textRow[Warehouse.DATASTORE]);
      expect(warehouse.id).to.exist;
    }
    connection.release();
  });
  it('searches a product in a warehouse and removes 5 of them when found', async function(){    
    const query = new MariaDatabase.SQLQuery(Product.DATASTORE);
    query.join('INNER JOIN', 'join_products_warehouses', 'id', 'product_id');
    query.join('INNER JOIN', 'warehouses', 'warehouse_id', 'id', 'join_products_warehouses');
    query.where('price > 5 AND join_products_warehouses.quantity > 5');
    const [joinedData] = await Product.query(query);
    expect(joinedData.length).to.be.greaterThan(0);
    const records = [];    
    for(let joinedRecord of joinedData){
      records.push({
        product: new Product(joinedRecord[Product.DATASTORE]),
        warehouse: new Warehouse(joinedRecord[Warehouse.DATASTORE])
      });
    }
    let theChosenOne = Utils.selectRandom(records);    
    let quantityBefore = await theChosenOne.warehouse.quantity(theChosenOne.product);
    let [purchaseSuccessful, error] = await theChosenOne.warehouse.purchase(theChosenOne.product, 5);
    expect(purchaseSuccessful).to.exist;
    let quantityNow = await theChosenOne.warehouse.quantity(theChosenOne.product);
    expect(quantityBefore-quantityNow).to.equal(5);
  });
});

after(async function(){
  Logger.info('Cleanup: Dropping user collection');
  await User.DB.connect().then(db=>db.dropCollection(User.DATASTORE));
  Logger.info('Cleanup: Dropping comment collection');
  await Comment.DB.connect().then(db=>db.dropCollection(Comment.DATASTORE));
  
  const connection = await mdb.connect();
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

//*/