/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @emails oncall+jsinfra@xmail.facebook.com
 */

/*jshint evil:true*/

require('mock-modules').autoMockOff();

describe('trailing-comma', function() {
  var transformFn;
  var visitors;

  beforeEach(function() {
    require('mock-modules').dumpCache();
    visitors = require('../trailing-comma-visitors').visitorList;
    transformFn = require('../../src/jstransform').transform;
  });

  function transform(code) {
    return transformFn(visitors, code).code;
  }

  // Functional tests.

  it('should strip commas from arrays', function() {
    var code = [
      '([',
      '  1,',
      '  2, /* last item */',
      ']);'
    ].join('\n');

    expect(eval(transform(code))).toEqual([1, 2]);
  });

  it('should strip commas from objects', function() {
    var code = [
      '({',
      '  x: 1,',
      '  y: 2, // last item',
      '});'
    ].join('\n');

    expect(eval(transform(code))).toEqual({x: 1, y: 2});
  });

  // Syntax tests.

  it('should transform code with trailing comma in an array', function() {
    var code = [
      'var arr = [',
      '  1,',
      '  [2, 3,],',
      '  4 /* last, item */ ,',
      '];'
    ].join('\n');
    var result = [
      'var arr = [',
      '  1,',
      '  [2, 3],',
      '  4 /* last item */ ',
      '];'
    ].join('\n');

    expect(transform(code)).toEqual(result);
  });

  it('should transform code with trailing comma in an array', function() {
    var code = [
      'var arr = [',
      '  1,',
      '  2, /* last item */',
      '];'
    ].join('\n');
    var result = [
      'var arr = [',
      '  1,',
      '  2 /* last item */',
      '];'
    ].join('\n');

    expect(transform(code)).toEqual(result);
  });

  it('should not strip trailing parenthesis', function() {
    var code = [
      'var result = [',
      '  value1,',
      '  (condition ? 1 : 2),',
      '];'
    ].join('\n');
    var result = [
      'var result = [',
      '  value1,',
      '  (condition ? 1 : 2)',
      '];'
    ].join('\n');

    expect(transform(code)).toEqual(result);
  });

  it('should transform code with trailing comma in an object', function() {
    var code = [
      'var obj = {',
      '  x: 1,',
      '  y: 2, /*last item*/',
      '};'
    ].join('\n');
    var result = [
      'var obj = {',
      '  x: 1,',
      '  y: 2 /*last item*/',
      '};'
    ].join('\n');

    expect(transform(code)).toEqual(result);
  });

  it('should NOT transform code with trailing hole in an array', function() {
    var code = [
      'var arr = [',
      '  1,',
      '  2,',
      '   , /*last hole*/',
      '];'
    ].join('\n');
    var result = [
      'var arr = [',
      '  1,',
      '  2,',
      '   , /*last hole*/',
      '];'
    ].join('\n');

    expect(transform(code)).toEqual(result);
  });

});

