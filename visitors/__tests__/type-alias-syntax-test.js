/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/*jshint evil:true*/

require('mock-modules').autoMockOff();

describe('static type syntax syntax', function() {
  var flowSyntaxVisitors;
  var jstransform;

  beforeEach(function() {
    require('mock-modules').dumpCache();

    flowSyntaxVisitors = require('../type-syntax.js').visitorList;
    jstransform = require('jstransform');
  });

  function transform(code, visitors) {
    code = jstransform.transform(
      flowSyntaxVisitors,
      code.join('\n'),
      {sourceType: 'nonStrictModule'}
    ).code;

    if (visitors) {
      code = jstransform.transform(
        visitors,
        code
      ).code;
    }

    return code;
  }

  describe('type alias', () => {
    it('strips type aliases', () => {
      /*global type*/
      /*global sanityCheck*/
      var code = transform([
        'var type = 42;',
        'type FBID = number;',
        'type type = string',
        'type += 42;'
      ]);
      eval(code);
      expect(type).toBe(84);
    });

    it('strips import-type declarations', () => {
      var code = transform([
        'import type DefaultExport from "MyModule";',
        'var sanityCheck = 42;',
      ]);
      eval(code);
      expect(sanityCheck).toBe(42);
    });

    it('catches up correctly', () => {
      var code = transform([
        "var X = require('X');",
        'type FBID = number;',
      ]);
      expect(code).toBe([
        "var X = require('X');",
        '                   '
      ].join('\n'));
    });
  });
});
