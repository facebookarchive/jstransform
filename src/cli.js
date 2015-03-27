var transform = require('./simple').transform;

require('commoner').version(
  require('../package.json').version
).resolve(function(id) {
  return this.readModuleP(id);
}).option(
  '--react',
  'Turns on the React JSX and React displayName transforms'
).option(
  '--es6',
  'Turns on available ES6 transforms'
).option(
  '--es7',
  'Turns on available ES7 transforms'
).option(
  '--harmony',
  'Shorthand to enable all ES6 and ES7 transforms'
).option(
  '--target [version]',
  'Specify your target version of ECMAScript. Valid values are "es3" and ' +
  '"es5". The default is "es5". "es3" will avoid uses of defineProperty and ' +
  'will quote reserved words. WARNING: "es5" is not properly supported, even ' +
  'with the use of es5shim, es5sham. If you need to support IE8, use "es3".',
  'es5'
).option(
  '--strip-types',
  'Strips out type annotations.'
).option(
  '--es6module',
  'Parses the file as a valid ES6 module. ' +
  '(Note that this means implicit strict mode)'
).option(
  '--non-strict-es6module',
  'Parses the file as an ES6 module, except disables implicit strict-mode. ' +
  '(This is useful if you\'re porting non-ES6 modules to ES6, but haven\'t ' +
  'yet verified that they are strict-mode safe yet)'
).option(
  '--source-map-inline',
  'Embed inline sourcemap in transformed source'
).process(function(id, source) {
  // This is where JSX, ES6, etc. desugaring happens.
  // We don't do any pre-processing of options so that the command line and the
  // JS API both expose the same set of options.
  var result = transform(source, this.options);
  return this.options.sourceMapInline ? result.sourceMapInline : result.code;
});

