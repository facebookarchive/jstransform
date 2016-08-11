/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */
'use strict';

require('mock-modules').autoMockOff();

var transformFn = require('jstransform').transform;
var visitors = require('../react-jsx-module-visitors').visitorList;

function transform(code) {
  return transformFn(visitors, code, {sourceType: 'module'});
}

describe('react jsx module', function() {

  it('should transpile to createClass and export module as default', function() {

    var code = [
      '<!doctype jsx>',
      '<ReactClass name="Whateva" export="default">',
      '  <div>X</div>',
      '</ReactClass>'
    ].join('\n');

    var expected = [
      '"use strict";',
      'var Whateva = React.createClass({',
      '  displayName: "Whateva",',
      '  render: function() {',
      '    return <div>X</div>;',
      '  }',
      '});',
      'export default Whateva;'
    ].join('\n');

    expect(transform(code).code).toEqual(expected);
  });

  it('should transpile to createClass and export modules', function() {
    var code = [
      '<!doctype jsx>',
      '<ReactClass name="Whateva">',
      '  <div>X</div>',
      '</ReactClass>',
      '<ReactClass name="Whateva2">',
      '  <div>Y</div>',
      '</ReactClass>'
    ].join('\n');

    var expected = [
      '"use strict";',
      'var Whateva = React.createClass({',
      '  displayName: "Whateva",',
      '  render: function() {',
      '    return <div>X</div>;',
      '  }',
      '});',
      'export Whateva;',
      'var Whateva2 = React.createClass({',
      '  displayName: "Whateva2",',
      '  render: function() {',
      '    return <div>Y</div>;',
      '  }',
      '});',
      'export Whateva2;',
    ].join('\n');

    expect(transform(code).code).toEqual(expected);
  });

});
