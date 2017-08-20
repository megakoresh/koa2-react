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
  appRoot: __dirname,
  env: process.env['NODE_ENV']
}