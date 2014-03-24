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

/* jshint evil:true */
/* global describe, beforeEach, expect, it*/


describe('es6-property-method-assignment', function() {
  var code;
  beforeEach(function() {
    var visitors = require('../es6-property-method-assignment').visitorList;
    var transformFn = require('../../src/jstransform').transform;
    code = transformFn(visitors, [
      '(function () {',
      ' return {',
      '   x: {',
      '     j() {',
      '       return this.j;',
      '     }',
      '   },',
      '   f() {',
      '     return this.f;',
      '   },',
      '   \'g\'() {},',
      '   "h"() {},',
      '   42() {},',
      '   null() {},',
      '   true() {},',
      '   false() {},',
      '   function() {},',
      '   var() {},',
      '   \'class\'() {}',  // NodeJS incorrectly flags {class: ...} as an error.
      ' };',
      '})();'
    ].join('\n')).code;
  });

  
  function expectMethod(object, name) {
    expect(object.hasOwnProperty(name)).toBe(true);
    var descriptor = Object.getOwnPropertyDescriptor(object, name);
    expect(typeof descriptor).toBe('object');
    expect(descriptor.enumerable).toBe(true);
    expect(typeof object[name]).toBe('function');
    // IE does not have a name property on functions.
    expect(object[name].name === '' || object[name].name === undefined).toBe(true);
  }
  
  // Functional tests.

  it('should transform property method assignment', function () {
   
    var object = eval(code);
    
    expect(Object.keys(object)).toEqual([
      '42',
      'x',
      'f',
      'g',
      'h',
      'null',
      'true',
      'false',
      'function',
      'var',
      'class'
    ]);
   
    expectMethod(object, 'f');
    expectMethod(object, 'g');
    expectMethod(object, 'h');
    expectMethod(object, '42');
    expectMethod(object, 'null');
    expectMethod(object, 'true');
    expectMethod(object, 'false');
    expectMethod(object, 'function');
    expectMethod(object, 'var');
    expectMethod(object, 'class');

    expect(object.f).toBe(object.f());

    // Test the nested object.
    expect(Object.keys(object.x)).toEqual(['j']);
    expectMethod(object.x, 'j');
  });
  
  
  it('should transform property method assignment', function () {
   
    expect(code).toEqual([
      '(function () {',
      ' return {',
      '   x: {',
      '     j: function() {',
      '       return this.j;',
      '     }',
      '   },',
      '   f: function() {',
      '     return this.f;',
      '   },',
      '   \'g\': function() {},',
      '   "h": function() {},',
      '   42: function() {},',
      '   null: function() {},',
      '   true: function() {},',
      '   false: function() {},',
      '   function: function() {},',
      '   var: function() {},',
      '   \'class\': function() {}',  // NodeJS incorrectly flags {class: ...} as an error.
      ' };',
      '})();'
    ].join('\n'));
  });
});


