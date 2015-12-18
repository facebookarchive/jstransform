/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

/*global exports:true*/

var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');

var jsxHelpers = require('./jsx-helpers');

var renderJSXExpressionContainer = jsxHelpers.renderJSXExpressionContainer;
var renderJSXLiteral = jsxHelpers.renderJSXLiteral;
var quoteAttrName = jsxHelpers.quoteAttrName;
var trimLeft = jsxHelpers.trimLeft;

/**
 * Customized desugar processor for React JSX. Currently:
 *
 * <X> </X> => React.createElement(X, null)
 * <X prop="1" /> => React.createElement(X, {prop: '1'}, null)
 * <X prop="2"><Y /></X> => React.createElement(X, {prop:'2'},
 *   React.createElement(Y, null)
 * )
 * <div /> => React.createElement("div", null)
 */

/**
 * Removes all non-whitespace/parenthesis characters
 */
var reNonWhiteParen = /([^\s\(\)])/g;
function stripNonWhiteParen(value) {
  return value.replace(reNonWhiteParen, '');
}

/**
 * Removes all non-comment/newline characters, preserving indentation after a
 * newline
 */
var reCommentNewline = /(\/\*[\s\S]*?\*\/|\/\/.*?(?=\n)|\n\s*)|./g;
function stripNonCommentNewline(value) {
  return value.replace(reCommentNewline, function(match, keep) {
    return keep || '';
  });
}

var tagConvention = /^[a-z]|\-/;
function isTagName(name) {
  return tagConvention.test(name);
}

function renderAttribute(attr, isLast, traverse, path, state) {
  utils.append(quoteAttrName(attr.name.name), state);
  utils.append(': ', state);

  if (!attr.value) {
    state.g.buffer += 'true';
    state.g.position = attr.name.range[1];
    if (!isLast) {
      utils.append(', ', state);
    }
  } else {
    utils.move(attr.name.range[1], state);
    // Use catchupNewlines to skip over the '=' in the attribute
    utils.catchupNewlines(attr.value.range[0], state);
    if (attr.value.type === Syntax.Literal) {
      renderJSXLiteral(attr.value, isLast, state);
    } else {
      renderJSXExpressionContainer(traverse, attr.value, isLast, path, state);
    }
  }

  utils.catchup(attr.range[1], state, trimLeft);
}


function visitReactTag(traverse, object, path, state) {
  var openingElement = object.openingElement;
  var nameObject = openingElement.name;
  var attributesObject = openingElement.attributes;

  utils.catchup(openingElement.range[0], state, trimLeft);

  if (nameObject.type === Syntax.JSXNamespacedName && nameObject.namespace) {
    throw new Error('Namespace tags are not supported. ReactJSX is not XML.');
  }

  var hasAtLeastOneSpreadProperty = false;
  var keyAttribute = null;
  var refAttribute = null;
  var propsObject = attributesObject.filter(function(attr) {
    if (attr.type === Syntax.JSXSpreadAttribute) {
      hasAtLeastOneSpreadProperty = true;
    } else if (attr.name.namespace) {
      throw new Error(
         'Namespace attributes are not supported. ReactJSX is not XML.');
    } else if (attr.name.name === 'key') {
      keyAttribute = attr;
      return false;
    } else if (attr.name.name === 'ref') {
      refAttribute = attr;
      return false;
    }
    return true;
  });

  var shouldInline =
    state.g.opts.inlineReactElements &&
    !hasAtLeastOneSpreadProperty &&
    !refAttribute;

  var isStringType =
    nameObject.type === Syntax.JSXIdentifier && isTagName(nameObject.name);

  // We assume that the React runtime is already in scope
  if (shouldInline) {
    if (!isStringType) {
      utils.append('React.__augmentElement', state);
    }
    utils.append('({type: ', state);
  } else {
    utils.append('React.createElement(', state);
  }

  if (isStringType) {
    utils.append('"' + nameObject.name + '"', state);
    utils.move(nameObject.range[1], state);
  } else {
    // Use utils.catchup in this case so we can easily handle
    // JSXMemberExpressions which look like Foo.Bar.Baz. This also handles
    // JSXIdentifiers that aren't fallback tags.
    utils.move(nameObject.range[0], state);
    utils.catchup(nameObject.range[1], state);
  }

  utils.append(', ', state);

  if (shouldInline) {
    if (keyAttribute) {
      renderAttribute(keyAttribute, false, traverse, path, state);
    } else {
      utils.append('key: void 0, ', state);
    }
    // We never inline elements with refs
    utils.append('ref: void 0, _owner: null, props: ', state);
  }

  var propsOrAttributes = shouldInline ? propsObject : attributesObject;
  var childrenToRender = object.children.filter(function(child) {
    return !(child.type === Syntax.Literal
             && typeof child.value === 'string'
             && child.value.match(/^[ \t]*[\r\n][ \t\r\n]*$/));
  });
  var nonEmptyChildren = childrenToRender.filter(function(child) {
    return (
      child.type !== Syntax.JSXExpressionContainer ||
      child.expression.type !== Syntax.JSXEmptyExpression
    );
  });
  var hasAttributes = propsOrAttributes.length;

  // if we don't have any attributes, pass in null
  if (hasAtLeastOneSpreadProperty) {
    utils.append('React.__spread({', state);
  } else if (hasAttributes || shouldInline) {
    utils.append('{', state);
  } else {
    utils.append('null', state);
  }

  // keep track of if the previous attribute was a spread attribute
  var previousWasSpread = false;

  // write attributes
  propsOrAttributes.forEach(function(attr, index) {
    var isLast = index === propsOrAttributes.length - 1;

    if (attr.type === Syntax.JSXSpreadAttribute) {
      // Close the previous object or initial object
      if (!previousWasSpread) {
        utils.append('}, ', state);
      }

      // Move to the expression start, ignoring everything except parenthesis
      // and whitespace.
      utils.catchup(attr.range[0], state, stripNonWhiteParen);
      // Plus 1 to skip `{`.
      utils.move(attr.range[0] + 1, state);
      utils.catchup(attr.argument.range[0], state, stripNonWhiteParen);

      traverse(attr.argument, path, state);

      utils.catchup(attr.argument.range[1], state);

      // Move to the end, ignoring parenthesis and the closing `}`
      utils.catchup(attr.range[1] - 1, state, stripNonWhiteParen);

      if (!isLast) {
        utils.append(', ', state);
      }

      utils.move(attr.range[1], state);

      previousWasSpread = true;

      return;
    }

    // If the next attribute is a spread, we're effective last in this object
    if (!isLast) {
      isLast = propsOrAttributes[index + 1].type === Syntax.JSXSpreadAttribute;
    }

    utils.catchup(attr.range[0], state, stripNonCommentNewline);

    if (previousWasSpread) {
      utils.append('{', state);
    }

    renderAttribute(attr, isLast, traverse, path, state);

    previousWasSpread = false;
  });

  if (!openingElement.selfClosing) {
    utils.catchup(openingElement.range[1] - 1, state, stripNonCommentNewline);
    utils.move(openingElement.range[1], state);
  }

  if (hasAttributes && !previousWasSpread && !shouldInline) {
    utils.append('}', state);
  }

  if (hasAtLeastOneSpreadProperty) {
    utils.append(')', state);
  }

  // filter out whitespace
  if (childrenToRender.length > 0) {
    var lastRenderableIndex;

    childrenToRender.forEach(function(child, index) {
      if (child.type !== Syntax.JSXExpressionContainer ||
          child.expression.type !== Syntax.JSXEmptyExpression) {
        lastRenderableIndex = index;
      }
    });

    if (lastRenderableIndex !== undefined) {
      if (shouldInline) {
        if (hasAttributes) {
          utils.append(', ', state);
        }
        utils.append('children: ', state);
        if (nonEmptyChildren.length > 1) {
          utils.append('[', state);
        }
      } else {
        utils.append(', ', state);
      }
    }

    childrenToRender.forEach(function(child, index) {
      utils.catchup(child.range[0], state, stripNonCommentNewline);

      var isLast = index >= lastRenderableIndex;

      if (child.type === Syntax.Literal) {
        renderJSXLiteral(child, isLast, state);
      } else if (child.type === Syntax.JSXExpressionContainer) {
        renderJSXExpressionContainer(traverse, child, isLast, path, state);
      } else {
        traverse(child, path, state);
        if (!isLast) {
          utils.append(', ', state);
        }
      }

      utils.catchup(child.range[1], state, stripNonCommentNewline);
    });

    if (shouldInline && nonEmptyChildren.length > 1) {
      utils.append(']', state);
    }
  }

  if (openingElement.selfClosing) {
    // everything up to />
    utils.catchup(openingElement.range[1] - 2, state, stripNonCommentNewline);
    utils.move(openingElement.range[1], state);
  } else {
    // everything up to </ sdflksjfd>
    utils.catchup(object.closingElement.range[0], state, stripNonCommentNewline);
    utils.move(object.closingElement.range[1], state);
  }

  if (shouldInline) {
    utils.append('}, _isReactElement: true}', state);
  }
  utils.append(')', state);
  return false;
}

visitReactTag.test = function(object, path, state) {
  return object.type === Syntax.JSXElement;
};

exports.visitorList = [
  visitReactTag
];
