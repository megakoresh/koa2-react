const path = require('path');
const { MongoDatabase, MariaDatabase } = require('database');

module.exports = {
  csrf: {
    "invalidSessionSecretMessage": "Invalid session secret",
    "invalidSessionSecretStatusCode": 403,
    "invalidTokenMessage": "Invalid CSRF token",
    "invalidTokenStatusCode": 403,
    "excludedMethods": [ "GET", "HEAD", "OPTIONS" ],
    "disableQuery": false
  },
  keys: {
    session: process.env['SESSION_SECRET'] || 'session-secret'    
  },
  appRoot: __dirname.split(path.sep).slice(0,-1).join(path.sep),
  env: process.env['NODE_ENV'],
  defaultMongo: new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_TEST_USER']}:${process.env['MONGO_TEST_PASS']}@${process.env['MONGO_TEST_HOST']}/testdb`)),
  defaultMaria: new MariaDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}:3306/test`))
}