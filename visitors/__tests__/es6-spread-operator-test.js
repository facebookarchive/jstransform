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
/* global describe, beforeEach, expect, it*/



describe('es6-spread-operator-visitors', function() {
  var visitors,
      transformFn;
  beforeEach(function() {
    visitors = require('../es6-spread-operator-visitors').visitorList;
    transformFn = require('../../src/jstransform').transform;
  });
  
  function transform(code) {
    return transformFn(visitors, code).code;
  }

  function expectTransform(code, result) {
    expect(transform(code)).toEqual(result);
  }
  
  function evalCode(code) {
    return eval(transform(code));
  }

  describe('within array', function () {
    it('should create an array concatanation of each object in array, and each parameters ', function () {
       expect(evalCode('[1, 2, ...[3, 4]]')).toEqual([1, 2, 3, 4]);
    });
    
    it('should throws an error if spread a non object ', function () {
       expect(function () {
         evalCode('[1, 2, ...{ a: 5 }');
       }).toThrow();
    });
    
    it('should throws an error if passing a non array', function () {
       expect(function () {
         evalCode('[1, 2, ...{ a: 5 }');
       }).toThrow();
    });
    
    it('should accept anything that resolve to an array', function () {
      expect(evalCode('[1, 2, ...(function () { return [3, 4] })()]')).toEqual([1, 2, 3, 4]);
    });
    
    it('should ouput the following code source', function () {
      expectTransform(
        '[1, 2, ...[3, 4]]',
        [
          'Array.prototype.concat.apply([],[1, 2, ',
          '(function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })([3, 4])])'
        ].join(''));
    });
    
    
    it('should keep lines break', function () {
      expectTransform(
        ['[1, 2,',
         '...[3,',
         ' 4]]'
        ].join('\n'),
        [
          'Array.prototype.concat.apply([],[1, 2,',
          '(function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })([3,',
          ' 4])])'
        ].join('\n'));
    });
  });

});


