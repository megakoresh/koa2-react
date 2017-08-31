const Utils = require('../utils');
const expect = require('chai').expect;
const models = Utils.requireFolder('models', /(Database|^Model)(\.js)/);
const logger = require('winston');

/**
 * Tests are the best way to ensure that basic functions of your
 * app work as expected so you can concentrate on business logic
 * as well make sure that none of your team members breaks core
 * functionality by not knowing or following conventions.
 * 
 * Despite what the "gurus" say about testing everything, unless
 * you have 100+ people in your software team and some dedicated
 * to tests full-time, writing tests for everything, and especially
 * user interactions is simply not feasable in most cases, and you
 * shouldn't try to do it. Instead write a test suite for the basic
 * underlying systems - database connections, remote api connections
 * (e.g. google, facebook, SAML etc.), image processing code, if
 * you have any, special algorithms, stuff like that. 
 * Then test user interactions yourself.
 * 
 * But don't omit tests completely, because when your fancy UI is
 * misbehaving because of a broken DB connection on the serverside,
 * that is exponentially longer to fix, than if the error is just in
 * your UI code. And worse yet - when you don't know that it can't be both.
 * I was in this situation in production environment, and you *don't*
 * want to end up in it.
 */

describe('User model:', async function() {
  const User = models.User;
  logger.info(`Testing user model. Database ${User.DB.url} and collection ${User.COLLECTION}`);
  it('tests whether connection works', async function() {
    await User.where({username: 'nopestitynopes'}); //this will create the collection implicitly
    const count = await User.DB.getDb().collection(User.COLLECTION).count();
    expect(count).to.equal(0);
  });
  it('inserts a user into the database', async function(){
    let newUser = new User({username: 'engi', avatar: 'http://i0.kym-cdn.com/photos/images/newsfeed/000/820/444/f64.gif'});
    await newUser.save();
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
    await mrNode.save();    
    mrNode = await User.find({favouriteWeapon: 'v8'});    
    expect(mrNode).to.equal(null);
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
    //in general you should avoid using anything database-specific outside of the models folder
    //but we are doing it for testing here, so this can be an exception
    await User.DB.getDb().dropCollection(User.COLLECTION);
  })
});
/* Test associations between user and comment
describe('Comment', function() {
  const Comment = models.Comment;
  logger.info(`Testing comment model. Database ${Comment.DB.url} and collection ${Comment.COLLECTION}`);
  it('tests whether connection works', async function() {
    await Comment.find();
    const count = await Comment.DB.collection(Comment.COLLECTION).count();
    expect(count).to.be.a('number');
  });
  it('posts a comment as a user', async function(){

  });
  it('posts another comment as a user', async function(){

  })
  it('likes a random comment', async function(){

  })
  it('updates an existing comment', async function(){

  })
  it('cleans up all the comments in the database', async function(){
    
  })
});
*/