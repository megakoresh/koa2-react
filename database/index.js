exports.Database = require('./Database');
exports.MongoDatabase = require('./MongoDatabase');
exports.MariaDatabase = require('./MariaDatabase');

const mongo = new MongoDatabase(encodeURI(`mongodb://${process.env['MONGO_TEST_USER']}:${process.env['MONGO_TEST_PASS']}@${process.env['MONGO_TEST_HOST']}/test`));
const maria = new MariaDatabase(encodeURI(`mysql://${process.env['MARIA_TEST_USER']}:${process.env['MARIA_TEST_PASS']}@${process.env['MARIA_TEST_HOST']}:3306/test`));

//TODO: change in production - actually return database instance for appropriate environment
exports.DEF_MONGO = mongo;
exports.DEF_MARIA = maria;
