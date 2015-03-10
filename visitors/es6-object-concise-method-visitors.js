/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*jslint node:true*/

/**
 * Desugars concise methods of objects to function expressions.
 *
 * var foo = {
 *   method(x, y) { ... }
 * };
 *
 * var foo = {
 *   method: function(x, y) { ... }
 * };
 *
 */

var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');
var reservedWordsHelper = require('./reserved-words-helper');

function visitObjectConciseMethod(traverse, node, path, state) {
  var isGenerator = node.value.generator;
  if (isGenerator) {
    utils.catchupWhiteSpace(node.range[0] + 1, state);
  }
  if (reservedWordsHelper.isReservedWord(node.key.name)) {
    utils.catchup(node.key.range[0], state);
    utils.append('"', state);
    utils.catchup(node.key.range[1], state);
    utils.append('"', state);
  }

  utils.catchup(node.key.range[1], state);
  utils.append(':', state);
  renderConciseMethod(traverse, node, path, state);
  return false;
}

// This method is also used by es6-object-computed-property-visitor to render
// the method for concise computed properties.
function renderConciseMethod(traverse, property, path, state) {
  if (property.computed) {
    var closingSquareBracketIndex = state.g.source.indexOf(']', property.key.range[1]);
    utils.catchup(closingSquareBracketIndex, state);
    utils.move(closingSquareBracketIndex + 1, state);
  }
  utils.append("function" + (property.value.generator ? "*" : ""), state);
  path.unshift(property);
  traverse(property.value, path, state);
  path.shift();
}

visitObjectConciseMethod.test = function(node, path, state) {
  return node.type === Syntax.Property &&
    node.value.type === Syntax.FunctionExpression &&
    node.method === true;
};

exports.renderConciseMethod = renderConciseMethod;
exports.visitorList = [
  visitObjectConciseMethod
];
