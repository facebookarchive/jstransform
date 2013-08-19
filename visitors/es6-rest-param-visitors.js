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
 * Desugars ES6 rest parameters into ES3 arguments slicing.
 *
 * function printf(template, ...args) {
 *   args.forEach(...);
 * };
 *
 * function printf(template) {
 *   var args = [].slice.call(arguments, 1);
 *   args.forEach(...);
 * };
 *
 */
var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');

/**
 * @public
 */
function visitFunctionWithRestParameters(traverse, node, path, state) {
  // Render params.
  if (node.params.length) {
    utils.catchup(node.params[node.params.length - 1].range[1], state);
  } else {
    // -3 is for ... of the rest.
    utils.catchup(node.rest.range[0] - 3, state);
  }
  utils.catchupWhiteSpace(node.rest.range[1], state);

  // Render rest variable.
  // Move to the body capturing opening brace as well.
  utils.catchup(node.body.range[0] + 1, state);
  utils.append('var '.concat(node.rest.name,
    '=Array.prototype.slice.call(arguments,', node.params.length, ');'
  ), state);

  traverse(node.body, path, state);
  return false;
}

visitFunctionWithRestParameters.test = function(node, path, state) {
  return (node.type == Syntax.FunctionDeclaration ||
    node.type == Syntax.FunctionExpression) && node.rest;
};

exports.visitorList = [
  visitFunctionWithRestParameters
];
