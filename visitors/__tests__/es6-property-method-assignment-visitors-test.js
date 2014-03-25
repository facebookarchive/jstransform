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


//those test cases have been inspired by google traceur ones :
// https://github.com/google/traceur-compiler/blob/master/test/feature/PropertyMethodAssignment/PropertyMethodAssignment.js

describe('es6-property-method-assignment-visitors', function() {
  var code;
  beforeEach(function() {
    var visitors = require('../es6-property-method-assignment-visitors').visitorList;
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
      '   \'class\'() {}',
      ' };',
      '})();'
    ].join('\n')).code;
  });

  
  function expectMethod(object, name) {
    var descriptor = Object.getOwnPropertyDescriptor(object, name);
    descriptor.value = typeof descriptor.value;
    expect(descriptor).toEqual({
      value: 'function',
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  
  it('should transform property method assignment', function () {
   
    var object = eval(code),
        keys = Object.keys(object);
    
    expect(keys).toEqual([
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
  
  
  it('should output the following code source', function () {
   
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
      '   \'class\': function() {}',
      ' };',
      '})();'
    ].join('\n'));
  });
});


