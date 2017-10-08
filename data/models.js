
/**
 * Enumerates all exportable models
 */

module.exports = {
    User,
    Comment
}

const Utils = require('utils');
const models = Utils.requireNamespace('data', 'model');

//here you have a chance to do some processing, e.g. override databases, etc.

Object.assign(exports, models);