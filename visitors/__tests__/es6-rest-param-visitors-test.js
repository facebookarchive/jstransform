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

/**
 * @emails dmitrys@fb.com javascript@lists.facebook.com
 */

/*jshint evil:true*/

require('mock-modules').autoMockOff();

describe('es6-rest-param-visitors', function() {
  var transformFn;
  var visitors;

  beforeEach(function() {
    require('mock-modules').dumpCache();
    visitors = require('../es6-rest-param-visitors').visitorList;
    transformFn = require('../../jstransform').transform;
  });

  function transform(code) {
    return transformFn(visitors, code).code;
  }

  function expectTransform(code, result) {
    expect(transform(code)).toEqual(result);
  }

  it('should capture 2 rest params, having 2 args', function() {
    var code = transform([
      '(function(x, y, ...args) {',
      '  return [x, y, args.length, args[0], args[1]];',
      '})(1, 2, 3, 4);'
    ].join('\n'));

    expect(eval(code)).toEqual([1, 2, 2, 3, 4]);
  });

  it('should transform rest parameters in nested functions, and get combined array', function() {
    var code = transform([
      '(function(x, ...args) {',
      '  return function(...params) {',
      '    return args.concat(params);',
      '  };',
      '})(1, 2, 3)(4, 5);'
    ].join('\n'));

    expect(eval(code)).toEqual([2, 3, 4, 5]);
  });

  it('should use array methods on the rest arguments', function() {
    var code = transform([
      'function printf(template, ...args) {',
      '  args.forEach(function(v) {',
      '    template = template.replace("%s", v);',
      '  });',
      '  return template;',
      '}'
    ].join('\n'));

    eval(code);

    expect(printf('Hello %s!', 'world')).toBe('Hello world!');
    expect(printf('Sator %s tenet %s rotas.', 'arepo', 'opera')).toBe('Sator arepo tenet opera rotas.');
  });

  // Syntax tests.

  it('should correctly transform rest parameters code', function() {

    // Function declaration 2 args, and the rest.
    expectTransform(
      'function foo(x, y, ...args) { return x + y + args[0]; }',
      'function foo(x, y ) {var args=Array.prototype.slice.call(arguments,2); return x + y + args[0]; }'
    );

    // Function expression, 1 arg, and the rest.
    expectTransform(
      '(function(x, ...args) { return args;});',
      '(function(x ) {var args=Array.prototype.slice.call(arguments,1); return args;});'
    );

    // Function expression, only rest.
    expectTransform(
      'map(function(...args) { return args.map(log); });',
      'map(function() {var args=Array.prototype.slice.call(arguments,0); return args.map(log); });'
    );

    // Preserve lines transforming ugly code.
    expectTransform([
      'function',
      '',
      'foo    (',
      '    x,',
      '          ...args',
      '',
      ')',
      '',
      '        {',
      ' return         args;',
      '}'
    ].join('\n'), [
      'function',
      '',
      'foo    (',
      '    x',
      '          ',
      '',
      ')',
      '',
      '        {var args=Array.prototype.slice.call(arguments,1);',
      ' return         args;',
      '}'
    ].join('\n'));

    // Preserve typechecker annotation.
    expectTransform(
      'function foo(/*string*/foo, /*bool*/bar, ...args) { return args; }',
      'function foo(/*string*/foo, /*bool*/bar ) {var args=Array.prototype.slice.call(arguments,2); return args; }'
    );
  });

});

