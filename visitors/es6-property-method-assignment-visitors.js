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


/**
 * Desugars ES6 Property method assignment into ES3 full notation.
 *
 * // Simplify way to declare methods
 * var myObject = {
 *   greet() {
 *     alert('Hello world');
 *   }
 * }
 *
 */
var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');

/**
 * @public
 */
function visitPropertyMethodAssignment(traverse, node, path, state) {
  utils.catchup(node.key.range[1], state);
  utils.append(': function', state);
  return false;
}

visitPropertyMethodAssignment.test = function(node) {
    return node.type === Syntax.Property &&
    node.kind === 'init' &&
    node.method === true;
};

exports.visitorList = [
  visitPropertyMethodAssignment
];

