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

var esprima = require('esprima-fb');
var utils = require('../src/utils');
var TypeExpressionParser = require('./TypeExpressionParser');

var Syntax = esprima.Syntax;

function createTypehint(/*object*/ node, state) /*string*/ {
  var typehint = TypeExpressionParser.fromFlow(node, state);
  return typehint ? '/*' + typehint + '*/' : '';
}

/**
 * Traverses each child of a given node in order as we would do normally,
 * catching up as we go.
 */
function traverseOrderedChildren(traverse, node, path, state) {
  if (node.type) {
    path.unshift(node);
  }
  utils.getOrderedChildren(node).forEach(function(child) {
    child.range && utils.catchup(child.range[0], state);
    traverse(child, path, state);
    child.range && utils.catchup(child.range[1], state);
  });
  if (node.type) {
    path.shift();
  }
}

/**
 * Traverse the AST to find and hoist all Flow type aliases within the current
 * "type alias closure". (As of this writing, type alias closures are the same
 * as function closures.)
 */
function hoistTypeAliases(node, state, callback) {
  var typeAliases;
  function collectTypeAliases(child) {
    // Functions create a new type alias closure.
    if (_isFunctionNode(child)) {
      return;
    }
    if (child.type === Syntax.TypeAlias) {
      typeAliases = typeAliases || {};
      typeAliases[child.id.name] = child.right;
    } else {
      utils.getOrderedChildren(child).forEach(function(child) {
        collectTypeAliases(child, typeAliases);
      });
    }
  }
  utils.getOrderedChildren(node).forEach(function(child) {
    collectTypeAliases(child, typeAliases);
  });
  if (typeAliases) {
    TypeExpressionParser.pushTypeAliases(state, typeAliases);
    callback();
    TypeExpressionParser.popTypeAliases(state);
  } else {
    callback();
  }
}

function ignoreTypeVariables(node, state, callback) {
  TypeExpressionParser.pushTypeVariables(node, state);
  callback();
  TypeExpressionParser.popTypeVariables(node, state);
}

function visitProgram(traverse, node, path, state) {
  TypeExpressionParser.initTypeAliasTracking(state);
  TypeExpressionParser.initTypeVariableScopeTracking(state);
  hoistTypeAliases(node, state, function() {
    traverseOrderedChildren(traverse, node, path, state);
  });
  return false;
}
visitProgram.test = function(node, path, state) {
  return node.type === Syntax.Program;
};

function visitFunctionOrTypeVariableDeclarator(traverse, node, path, state) {
  var declaresTypeVariables = _declaresTypeVariables(node);
  var declaresTypeAliasScope = _isFunctionNode(node);

  if (declaresTypeVariables && declaresTypeAliasScope) {
    ignoreTypeVariables(node, state, function() {
      hoistTypeAliases(node, state, function() {
        traverseOrderedChildren(traverse, node, path, state);
      });
    });
  } else if (declaresTypeVariables) {
    ignoreTypeVariables(node, state, function() {
      traverseOrderedChildren(traverse, node, path, state);
    });
  } else { // declaresTypeAliasScope
    hoistTypeAliases(node, state, function() {
      traverseOrderedChildren(traverse, node, path, state);
    });
  }
  utils.catchup(node.range[1], state);
  return false;
}
visitFunctionOrTypeVariableDeclarator.test = function(node, path, state) {
  return _isFunctionNode(node) || _declaresTypeVariables(node);
};

function _isFunctionNode(node) {
  return node.type === Syntax.FunctionDeclaration
         || node.type === Syntax.FunctionExpression
         || node.type === Syntax.ArrowFunctionExpression;
}

function _declaresTypeVariables(node) {
  switch (node.type) {
  case Syntax.FunctionDeclaration:
  case Syntax.FunctionExpression:
  case Syntax.ClassDeclaration:
  case Syntax.ClassExpression:
    return node.typeParameters !== null && node.typeParameter !== undefined;
  // Not handled:
  // Interfaces - stripped out so not relevant
  // Type aliases - stripped out so not relevant
  // Methods - Handled below
  default:
    return false;
  }
}

function visitClassProperty(traverse, node, path, state) {
  utils.catchup(node.range[0], state);
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitClassProperty.test = function(node, path, state) {
  return node.type === Syntax.ClassProperty;
};

function visitTypeAlias(traverse, node, path, state) {
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitTypeAlias.test = function(node, path, state) {
  return node.type === Syntax.TypeAlias;
};

function visitInterfaceDeclaration(traverse, node, path, state) {
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitInterfaceDeclaration.test = function(node, path, state) {
  return node.type === Syntax.InterfaceDeclaration;
};

function visitDeclare(traverse, node, path, state) {
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitDeclare.test = function(node, path, state) {
  switch (node.type) {
  case Syntax.DeclareVariable:
  case Syntax.DeclareFunction:
  case Syntax.DeclareClass:
  case Syntax.DeclareModule: return true;
  }
  return false;
};

function visitFunctionParametricAnnotation(traverse, node, path, state) {
  utils.catchup(node.range[0], state);
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitFunctionParametricAnnotation.test = function(node, path, state) {
  return node.type === Syntax.TypeParameterDeclaration
         && path[0]
         && _isFunctionNode(path[0])
         && node === path[0].typeParameters;
};

function visitFunctionReturnAnnotation(traverse, node, path, state) {
  utils.catchup(node.range[0], state);
  var typehint = createTypehint(node.typeAnnotation, state);
  if (typehint) {
    utils.append(' ' + typehint, state);
  }
  utils.move(node.range[1], state);
  return false;
}
visitFunctionReturnAnnotation.test = function(node, path, state) {
  return path[0] && _isFunctionNode(path[0]) && node === path[0].returnType;
};

function visitOptionalFunctionParameterAnnotation(traverse, node, path, state) {
  utils.catchup(node.range[0] + node.name.length, state);
  utils.catchupWhiteOut(node.range[1], state);
  return false;
}
visitOptionalFunctionParameterAnnotation.test = function(node, path, state) {
  return node.type === Syntax.Identifier
         && node.optional
         && path[0]
         && _isFunctionNode(path[0]);
};

function visitTypeAnnotatedIdentifier(traverse, node, path, state) {
  utils.catchup(node.range[0], state);
  var typehint = createTypehint(node.typeAnnotation.typeAnnotation, state);
  if (typehint) {
    utils.append(typehint + ' ', state);
  }
  utils.catchup(node.typeAnnotation.range[0], state);
  utils.move(node.typeAnnotation.range[1], state);
  return false;
}
visitTypeAnnotatedIdentifier.test = function(node, path, state) {
  return node.type === Syntax.Identifier && node.typeAnnotation;
};

function visitTypeAnnotatedObjectOrArrayPattern(traverse, node, path, state) {
  utils.catchup(node.typeAnnotation.range[0], state);
  utils.catchupWhiteOut(node.typeAnnotation.range[1], state);
  return false;
}
visitTypeAnnotatedObjectOrArrayPattern.test = function(node, path, state) {
  var rightType = node.type === Syntax.ObjectPattern
                || node.type === Syntax.ArrayPattern;
  return rightType && node.typeAnnotation;
};

/**
 * Methods cause trouble, since esprima parses them as a key/value pair, where
 * the location of the value starts at the method body. For example
 * { bar(x:number,...y:Array<number>):number {} }
 * is parsed as
 * { bar: function(x: number, ...y:Array<number>): number {} }
 * except that the location of the FunctionExpression value is 40-something,
 * which is the location of the function body. This means that by the time we
 * visit the params, rest param, and return type organically, we've already
 * catchup()'d passed them.
 */
function visitMethod(traverse, node, path, state) {
  path.unshift(node);
  traverse(node.key, path, state);

  TypeExpressionParser.pushTypeVariables(node.value, state);
  path.unshift(node.value);
  traverse(node.value.params, path, state);
  node.value.rest && traverse(node.value.rest, path, state);
  node.value.returnType && traverse(node.value.returnType, path, state);
  traverse(node.value.body, path, state);

  path.shift();
  TypeExpressionParser.popTypeVariables(node.value, state);

  path.shift();
  return false;
}

visitMethod.test = function(node, path, state) {
  return (node.type === "Property" && (node.method || node.kind === "set" || node.kind === "get"))
      || (node.type === "MethodDefinition");
};

exports.visitorList = [
  visitClassProperty,
  visitDeclare,
  visitInterfaceDeclaration,
  visitFunctionParametricAnnotation,
  visitFunctionReturnAnnotation,
  visitMethod,
  visitOptionalFunctionParameterAnnotation,
  visitProgram,
  visitFunctionOrTypeVariableDeclarator,
  visitTypeAlias,
  visitTypeAnnotatedIdentifier,
  visitTypeAnnotatedObjectOrArrayPattern
];
