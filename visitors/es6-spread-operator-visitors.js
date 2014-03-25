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

var spreadTemplate = '(function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })(';

function visitArrayWithSpreadElement(traverse, node, path, state){
  utils.append('Array.prototype.concat.apply([],', state);
  utils.catchup(node.range[0], state);
  node.elements.forEach(function (node) {
    utils.catchup(node.range[0], state);
    if (node.type === Syntax.SpreadElement) {
      utils.append(spreadTemplate, state);
      utils.move(node.range[0] + 3, state);
      utils.catchup(node.range[1], state);
      utils.append(')', state);
    } else {
      utils.catchup(node.range[1], state);
    }
  });
  utils.catchup(node.range[1], state);
  utils.append(')', state);
}

visitArrayWithSpreadElement.test = function (node, path, state) {
  return node.type === Syntax.ArrayExpression &&
    node.elements &&
    node.elements.some(function (node) {
      return node.type === Syntax.SpreadElement;
    });
};

exports.visitorList = [
  visitArrayWithSpreadElement
];
