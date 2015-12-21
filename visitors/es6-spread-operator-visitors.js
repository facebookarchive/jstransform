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
 * Desugars ES6 spread operator into ES5 (and ES3 with ES5-shim) equivalent expression
 *
 * [1, 2, 3, ...[4, 5]] 
 * is transformed into an expression equivalent to :
 * [1, 2, 3, 4, 5]
 * 
 * myFunction(...[1, 2]) 
 * is transformed in an expression equivalent to :
 * myFunction(1, 2)
 *
 * myObject.myMethod(…[1, 2]) 
 * is transformed in an expression equivalent to :
 * myObject.myMethod(1, 2)
 * 
 * new MyClass(...[1, 2]) 
 * is transformed in an expression equivalent to :
 * new MyClass(1, 2) 
 * 
 *
 * works only with arrays (no 'iterable object')
 */
var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');
var fs = require('fs');
var path = require('path');
var runtimeCode = fs.readFileSync(path.join(__dirname, 'es6-spread-operator-runtime.js'), 'utf-8');
var runtime = '____JSTRANSFORM_SPREAD_RUNTIME____';

function hasSpread(elements) {
  return elements &&
    elements.some(function (node) {
      return node.type === Syntax.SpreadElement;
    });
}

function generateIdent(base) {
  return base + (Math.random() * 1e9 >>> 0);
}

function replaceInNonComments(search, replace) {
  return function (source) {
    var result = '', inBlockComment = false, inLineComment = false;
    while (source) {
      var char = source.charAt(0);
      source = source.substr(1);
      if (inBlockComment) {
        if (char === '*' && source.charAt(0) === '/') {
            inBlockComment = false;
        }
      } else if (inLineComment) {
        if (char === '\n') {
            inLineComment = false;
        }
      } else if (char === '/') {
        var next = source.charAt(0);
        if (next === '*') {
            inBlockComment = true;
        } else if (next === '/') {
            inLineComment = true;
        }
      }
      
      if(char === search && !inBlockComment && !inLineComment) {
          result += replace;
      } else {
          result += char;
      }
    }
    return result;
  };
}

function insertElementsWithSpread(elements, state) {
  var insideBrackets = false;
  elements.forEach(function (node) {
    if (node.type === Syntax.SpreadElement) {
      if (insideBrackets) {
        utils.append(']', state);
        insideBrackets = false;
      }
      utils.catchup(node.range[0], state);
      utils.append(runtime + '.assertSpreadElement(', state);
      utils.move(node.range[0] + 3, state); // remove ...
      utils.catchup(node.range[1], state);
      utils.append(')', state);
    } else {
      if (!insideBrackets) {
        utils.append('[', state);
        insideBrackets = true;
      }
      utils.catchup(node.range[1], state);
    }
  });
  if (insideBrackets) {
    utils.append(']', state);
  }
}


function visitProgram(traverse, node, path, state) {
  if (state.g.opts.includeSpreadRuntime) {
    utils.append(runtimeCode, state);
  }
}
visitProgram.test = function(node) {
  return node.type === Syntax.Program;
};

function visitArrayExpressionWithSpreadElement(traverse, node, path, state) {
  utils.catchup(node.elements[0].range[0], state,
                replaceInNonComments('[', 'Array.prototype.concat.call('));
  insertElementsWithSpread(node.elements, state);
  utils.catchup(node.range[1], state, replaceInNonComments(']', ')'));
}

visitArrayExpressionWithSpreadElement.test = function (node) {
  return node.type === Syntax.ArrayExpression && hasSpread(node.elements);
};


function visitFunctionCallWithSpreadElement(traverse, node, path, state) {
  var thisIdent = 'undefined';
  if (node.callee.type === Syntax.MemberExpression) {
    thisIdent = generateIdent('_this');
    utils.append('(function() { ', state);
    utils.append('var ' + thisIdent + ' = ', state);
    utils.catchup(node.callee.object.range[1], state);
    utils.append('; return '+ thisIdent , state);
  }
  
  utils.catchup(node.callee.range[1], state);
  utils.append('.apply(' + thisIdent + ', ', state);
  
  utils.catchup(node.arguments[0].range[0], state, replaceInNonComments('(', 'Array.prototype.concat.call('));
  insertElementsWithSpread(node.arguments, state);
  utils.catchup(node.range[1], state);
  
  utils.append(')', state);
  
  if (node.callee.type === Syntax.MemberExpression) {
    utils.append('})()', state);
  }
}

visitFunctionCallWithSpreadElement.test = function (node) {
  return node.type === Syntax.CallExpression && hasSpread(node.arguments);
};


function visitNewExpressionWithSpreadElement(traverse, node, path, state) {
  utils.move(node.range[0] + 4 , state); //remove 'new '
  utils.catchup(node.callee.range[0], state);
  utils.append(runtime + '.executeNewExpression(', state);
  utils.catchup(node.callee.range[1], state);
  utils.catchup(node.arguments[0].range[0], state, replaceInNonComments('(', ', Array.prototype.concat.call('));
  insertElementsWithSpread(node.arguments, state);
  utils.catchup(node.range[1], state);
  utils.append(')', state);
}

visitNewExpressionWithSpreadElement.test = function (node) {
  return node.type === Syntax.NewExpression && hasSpread(node.arguments);
};

exports.visitorList = [
  visitProgram,
  visitArrayExpressionWithSpreadElement,
  visitFunctionCallWithSpreadElement,
  visitNewExpressionWithSpreadElement
];
