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

function hasSpread(elements) {
  return elements &&
    elements.some(function (node) {
      return node.type === Syntax.SpreadElement;
    });
}

function randomInt() {
  return  Math.random() * 1e9 >>> 0;
}

function insertElementsWithSpread(elements, state) {
  elements.forEach(function (node) {
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
}

function visitArrayExpressionWithSpreadElement(traverse, node, path, state) {
  utils.append('Array.prototype.concat.apply([],', state);
  utils.catchup(node.range[0], state);
  insertElementsWithSpread(node.elements, state);
  utils.catchup(node.range[1], state);
  utils.append(')', state);
}

visitArrayExpressionWithSpreadElement.test = function (node) {
  return node.type === Syntax.ArrayExpression && hasSpread(node.elements);
};


function visitFunctionCallWithSpreadElement(traverse, node, path, state) {
  if (node.callee.type === Syntax.MemberExpression) {
    var thisIdent = '_this' + randomInt();
    utils.append('(function() { var ' + thisIdent + ' = ', state);
    utils.catchup(node.callee.object.range[1], state);
    utils.append('; return '+ thisIdent , state);
    utils.catchup(node.callee.range[1], state);
    utils.append('.apply('+ thisIdent + ', Array.prototype.concat.apply([],', state);
  } else {
    utils.catchup(node.callee.range[1], state);
    utils.append('.apply(undefined, Array.prototype.concat.apply([],', state);
  }
  utils.catchup(node.arguments[0].range[0], state, function (content) {
    //todo too much simplist here we will replace all '(' in comments also
    return content.replace(/\(/g, '[');
  });
  insertElementsWithSpread(node.arguments, state);
  utils.catchup(node.range[1], state, function (content) {
    //todo too much simplist here we will replace all ')' in comments also
    return content.replace(/\)/g, ']');
  });
  utils.append('))', state);
  if (node.callee.type === Syntax.MemberExpression) {
    utils.append('})()',state);
  }
}

visitFunctionCallWithSpreadElement.test = function (node) {
  return node.type === Syntax.CallExpression && hasSpread(node.arguments);
};


function visitNewExpressionWithSpreadElement(traverse, node, path, state) {
  var classIdent = '_class' + randomInt(),
      resultIdent = '_result' + randomInt();
   
  utils.move(node.range[0] + 4 , state); //remove 'new '
  utils.catchup(node.callee.range[0], state);
  utils.append('(function() { var ' + classIdent + ' = ', state);
  utils.catchup(node.callee.range[1], state);
  utils.append(', ' + resultIdent + ' = Object.create(' + classIdent + '.prototype);', state);
  utils.append( classIdent + '.apply('+ resultIdent + ', Array.prototype.concat.apply([],', state);
  utils.catchup(node.arguments[0].range[0], state, function (content) {
    //todo too much simplist here we will replace all '(' in comments also
    return content.replace(/\(/g, '[');
  });
  insertElementsWithSpread(node.arguments, state);
  utils.catchup(node.range[1], state, function (content) {
    //todo too much simplist here we will replace all ')' in comments also
    return content.replace(/\)/g, ']');
  });
  utils.append('));return ' + resultIdent + ';})()', state);
}

visitNewExpressionWithSpreadElement.test = function (node) {
  return node.type === Syntax.NewExpression && hasSpread(node.arguments);
};

exports.visitorList = [
  visitArrayExpressionWithSpreadElement,
  visitFunctionCallWithSpreadElement,
  visitNewExpressionWithSpreadElement
];
