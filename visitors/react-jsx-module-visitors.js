/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
/*global exports:true*/
'use strict';

var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');

/**
 * Transforms the following:
 *
 * <!doctype jsx>
 * <ReactClass MyComponent>'
 *   <ELEMENTS...>
 *   <SCRIPTS...>
 * </ReactClass MyComponent>
 *
 * into:
 *
 * var MyComponent = React.createClass({
 *    displayName: 'MyComponent',
 *    render: ()=>ELEMENTS,
 *    TRANSPILED SCRIPTS
 * });
 * export MyComponent;
 *
 */

function visitReactJSXModuleDeclaration(traverse, node, path, state) {

  utils.append('"use strict";', state);
  traverse(node.imports, path, state);
  utils.move(node.range[1], state);

  return false;

}

/**
 * Transforms the following:
 *
 * <!doctype jsx>
 * <ReactClass MyComponent>'
 *   <ELEMENTS...>
 *   <SCRIPTS...>
 * </ReactClass MyComponent>
 *
 * into:
 *
 * var MyComponent = React.createClass({
 *    displayName: 'MyComponent',
 *    render: ()=>ELEMENTS,
 *    TRANSPILED SCRIPTS
 * });
 * export MyComponent;
 *
 */
function visitReactJSXClassDeclaration(traverse, node, path, state) {

  state = utils.updateState(state, {
    className: node.className
  });

  utils.append('var ' + state.className.name+ ' = React.createClass({', state);

  utils.move(node.className.range[0], state);
  utils.append('\n  displayName: "'+state.className.name+'",', state);

  utils.append('\n  render: function() {\n    return ', state);

  utils.move(node.render.range[0], state);
  traverse(node.render, path, state);
  utils.move(node.render.range[1], state);
  utils.append(';\n  }', state);

  utils.move(node.range[1], state);
  utils.append('\n});', state);

  var error, export_class=true;
  node.attributes.forEach(function(attr) {
    switch (attr.name.name) {
    case 'export':
       switch (attr.value.value) {
       case 'false':
         export_class = false;
         break;
       case 'default':
         export_class = 'default';
         break;
       case 'true':
         break;
       default:
         error = 'Invalid value for export attribute';
         break;
       }
       break;
    default:
      error = 'Invalid attribute '+attr.name.name;
      break;
    }
  });

  if (error)
     throw new Error(error +'. (line: ' +
       node.loc.start.line + ', col: ' + node.loc.start.column + ')'
     );
  if (export_class === 'default')
    utils.append('\nexport default '+state.className.name+';', state);
  else if (export_class === true)
    utils.append('\nexport '+state.className.name+';', state);
  //utils.catchupWhiteSpace(node.range[1], state);
  //utils.catchupWhiteSpace(node.range[1], state);

  //_renderClassBody(traverse, node, path, state);

  return false;

}

/**
 * @param {function} traverse
 * @param {object} node
 * @param {array} path
 * @param {object} state
 */
function _renderClassBody(traverse, node, path, state) {
  var className = state.className;

//  utils.append(
//    'var ' + superClass.name + '=' + superClass.expression + ';',
//    state
//  );
//
//
//    var keyName = superClass.name + '____Key';
//    var keyNameDeclarator = '';
//    if (!utils.identWithinLexicalScope(keyName, state)) {
//      keyNameDeclarator = 'var ';
//      declareIdentInLocalScope(keyName, initScopeMetadata(node), state);
//    }
//    utils.append(
//      'for(' + keyNameDeclarator + keyName + ' in ' + superClass.name + '){' +
//        'if(' + superClass.name + '.hasOwnProperty(' + keyName + ')){' +
//          className + '[' + keyName + ']=' +
//            superClass.name + '[' + keyName + '];' +
//        '}' +
//      '}',
//      state
//    );
//
//    var superProtoIdentStr = SUPER_PROTO_IDENT_PREFIX + superClass.name;
//    if (!utils.identWithinLexicalScope(superProtoIdentStr, state)) {
//      utils.append(
//        'var ' + superProtoIdentStr + '=' + superClass.name + '===null?' +
//        'null:' + superClass.name + '.prototype;',
//        state
//      );
//      declareIdentInLocalScope(superProtoIdentStr, initScopeMetadata(node), state);
//    }
//
//    utils.append(
//      className + '.prototype=Object.create(' + superProtoIdentStr + ');',
//      state
//    );
//    utils.append(
//      className + '.prototype.constructor=' + className + ';',
//      state
//    );
//    utils.append(
//      className + '.__superConstructor__=' + superClass.name + ';',
//      state
//    );
//  }
//
//  // If there's no constructor method specified in the class body, create an
//  // empty constructor function at the top (same line as the class keyword)
//  if (!node.body.body.filter(_isConstructorMethod).pop()) {
//    utils.append('function ' + className + '(){', state);
//    if (!state.scopeIsStrict) {
//      utils.append('"use strict";', state);
//    }
//    if (superClass.name) {
//      utils.append(
//        'if(' + superClass.name + '!==null){' +
//        superClass.name + '.apply(this,arguments);}',
//        state
//      );
//    }
//    utils.append('}', state);
//  }
//
//  utils.move(node.body.range[0] + '{'.length, state);
//  traverse(node.body, path, state);
//  utils.catchupWhiteSpace(node.range[1], state);
}


visitReactJSXModuleDeclaration.test = function(node, path, state) {
  return node.type === Syntax.JSXModuleDeclaration;
};

visitReactJSXClassDeclaration.test = function(node, path, state) {
  return node.type === Syntax.JSXClassDeclaration && node.superClass.name === 'ReactClass';
};

exports.visitorList = [
  visitReactJSXModuleDeclaration,
  visitReactJSXClassDeclaration
];
