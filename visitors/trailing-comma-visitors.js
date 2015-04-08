/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 */

var Syntax = require('esprima-fb').Syntax;
var utils = require('../src/utils');

/**
 * Strips trailing commas from array and object expressions. Transforms:
 *
 * var arr = [
 *   foo,
 *   bar,
 * ];
 *
 * var obj = {
 *   foo: 1,
 *   bar: 2,
 * };
 *
 * into:
 *
 * var arr = [
 *   foo,
 *   bar
 * ];
 *
 * var obj = {
 *   foo: 1,
 *   bar: 2
 * };
 *
 */
function visitArrayOrObjectExpression(traverse, node, path, state) {
  var items = node.elements || node.properties;
  var lastItem = items[items.length - 1];

  // Transform items if needed.
  path.unshift(node);
  traverse(items, path, state);
  path.shift();

  // Catch up to the end of the last item.
  utils.catchup(lastItem.range[1], state);

  // Strip any non-whitespace between the last item and the end.
  utils.catchup(node.range[1] - 1, state, function(value) {
    return value.replace(/,/g, '');
  });
  return false;
}

visitArrayOrObjectExpression.test = function(node, path, state) {
  return (node.type === Syntax.ArrayExpression ||
    node.type === Syntax.ObjectExpression) &&
    (node.elements || node.properties).length > 0 &&
    // We don't want to run the transform on arrays with trailing holes, since
    // it would change semantics.
    !hasTrailingHole(node);
};

function hasTrailingHole(node) {
  return node.elements && node.elements.length > 0 &&
    node.elements[node.elements.length - 1] === null;
}

exports.visitorList = [
  visitArrayOrObjectExpression
];
