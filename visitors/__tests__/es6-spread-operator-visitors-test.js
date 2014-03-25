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

/*jshint evil:true, unused: false*/
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
  

  describe('within array', function () {
    it('should create an array concatanation of each object in array, and each parameters ', function () {
       expect(eval(transform('[1, 2, ...[3, 4]]'))).toEqual([1, 2, 3, 4]);
    });
    
    it('should works with only spread', function () {
        expect(eval(transform('[...[1, 2]]'))).toEqual([1, 2]);
    });
    
    it('should throws an error if spread a non object ', function () {
       expect(function () {
         eval(transform('[1, 2, ...{ a: 5 }'));
       }).toThrow();
    });
    
    it('should throws an error if passing a non array', function () {
       expect(function () {
         eval(transform('[1, 2, ...{ a: 5 }'));
       }).toThrow();
    });
    
    it('should accept anything that resolve to an array', function () {
      expect(eval(transform('[1, 2, ...(function () { return [3, 4] })()]'))).toEqual([1, 2, 3, 4]);
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
  
  
  describe('within call expression', function () {
    
    function returnArgs () {
      return Array.prototype.slice.call(arguments);
    }
    
    
    it('should pass spread array as parameters  ', function () {
      expect(eval(transform('returnArgs(1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4]);
    });
   
    it('should ouput the following code source', function () {
      expectTransform(
        'returnArgs(1, 2,...[3, 4])',
        [
          'returnArgs.apply(undefined, ',
          'Array.prototype.concat.apply([],[1, 2,',
          '(function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })([3, 4])]))'
        ].join(''));
    });
    
    
    it('should keep lines break and comments', function () {
      expectTransform(
        [
          'returnArgs  /*comments*/(',
          ' 1, 2,',
          ' ...[3, 4]',
          ')'
        ].join('\n'),
        [
          'returnArgs.apply(undefined, Array.prototype.concat.apply([],  /*comments*/[',
          ' 1, 2,',
          ' (function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })([3, 4])',
          ']))'
        ].join('\n'));
    });
  });
  
  
  describe('within method call expression', function () {
    
    var object = {
      returnArgsAndThis: function() {
        return Array.prototype.slice.call(arguments).concat(this);
      }
    };
    
    
    it('should keep the \'this\' context in case of method call ', function () {
      expect(eval(transform('object.returnArgsAndThis(1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4, object]);
    });
    
    it('should keep the \'this\' context in case of computed method call ', function () {
      expect(eval(transform('object[\'return\'+\'ArgsAndThis\'](1, 2, ...[3, 4])'))).toEqual([1, 2, 3, 4, object]);
    });
    
    
    it('should ouput the following code source', function () {
      var transformedCode = transform('object.returnArgsAndThis(1, 2, ...[3, 4])');
      transformedCode = transformedCode.replace(/_this\d*/g, '_this');
      expect(transformedCode).toBe([
        '(function() { var _this = object; return _this.returnArgsAndThis',
        '.apply(_this, Array.prototype.concat.apply([],[1, 2, ',
        '(function(v) { return Array.isArray(v)? v : !function () { throw new TypeError(v + \' is not an array\'); }() })([3, 4])]))})()'
      ].join(''));
    });
   
    
  });
});


