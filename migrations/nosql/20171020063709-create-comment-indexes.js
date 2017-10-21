'use strict';

let dbm;
let type;
let seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  let collection = await db.createCollection('comments');
  let indexName = await collection.createIndex('comments', 'userId', {background:true, w:1}); //create an index on the userId "foreign key"
  if (typeof indexName === 'undefined') return Promise.reject(new Error('Could not create an index on comment collection'));
  return Promise.resolve(indexName);
}

exports.down = function(db) {
  return db.collection('comments').dropIndex('userId');
};

exports._meta = {
  "version": 1
};