/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/*jslint node:true*/

/**
 * Desugars ES7 rest properties into ES5 object iteration.
 */

var Syntax = require('esprima-fb').Syntax;

// TODO: This is a pretty massive helper, it should only be defined once, in the
// transform's runtime environment. We don't currently have a runtime though.
var restFunction =
  '(function(source, exclusion) {' +
    'var rest = {};' +
    'var hasOwn = Object.prototype.hasOwnProperty;' +
    'if (source == null) {' +
      'throw new TypeError();' +
    '}' +
    'for (var key in source) {' +
      'if (hasOwn.call(source, key) && !hasOwn.call(exclusion, key)) {' +
        'rest[key] = source[key];' +
      '}' +
    '}' +
    'return rest;' +
  '})';

function getPropertyNames(properties) {
  var names = [];
  for (var i = 0; i < properties.length; i++) {
    var property = properties[i];
    if (property.type === Syntax.SpreadProperty) {
      continue;
    }
    if (property.type === Syntax.Identifier) {
      names.push(property.name);
    } else {
      names.push(property.key.name);
    }
  }
  return names;
}

function getRestFunctionCall(source, exclusion) {
  return restFunction + '(' + source + ',' + exclusion + ')';
}

function getSimpleShallowCopy(accessorExpression, polyfilled) {
  if (polyfilled) {
    return 'Object.assign({}, ' + accessorExpression + ')';
  } else {
    return getRestFunctionCall(accessorExpression, '{}');
  }
}

function renderRestExpression(accessorExpression, excludedProperties, polyfilled) {
  var excludedNames = getPropertyNames(excludedProperties);
  if (!excludedNames.length) {
    return getSimpleShallowCopy(accessorExpression, polyfilled);
  }
  return getRestFunctionCall(
    accessorExpression,
    '{' + excludedNames.join(':1,') + ':1}'
  );
}

exports.renderRestExpression = renderRestExpression;
