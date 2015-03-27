// Just re-export the simple API. This will eventually go away.
// require('jstransform') will give the simple API and the current API will be
// moved to something else (perhaps 'jstranform/advanced')
module.exports = require('./src/simple');
