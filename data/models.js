
/**
 * Enumerates all exportable models
 */

module.exports = {
    User: null,
    Comment: null
}

const Utils = require('common').Utils;
const models = Utils.requireNamespace('data', 'model');

//here you have a chance to do some processing, e.g. override databases, etc.

Object.assign(exports, models);