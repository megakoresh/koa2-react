const path = require('path');

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
  env: process.env['NODE_ENV']
}
