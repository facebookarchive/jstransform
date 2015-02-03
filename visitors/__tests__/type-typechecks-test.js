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

/*jshint evil:true*/
/*jshint -W117*/

require('mock-modules').autoMockOff();

describe('static type function syntax', function() {
  var flowSyntaxVisitors;
  var jstransform;

  beforeEach(function() {
    require('mock-modules').dumpCache();

    flowSyntaxVisitors = require('../type-syntax.js').visitorList;
    jstransform = require('jstransform');
  });

  function transform(code, visitors) {
    code = code.join('\n');

    // We run the flow transform first
    code = jstransform.transform(
      flowSyntaxVisitors,
      code
    ).code;

    if (visitors) {
      code = jstransform.transform(
        visitors,
        code
      ).code;
    }
    return code;
  }
  describe('@typechecks annotations', () => {
    it('emits the proper annotations', () => {
      expect(transform([
        'function test(\n' +
        '  arr: Array,\n' +
        '  arrstr: Array<string>,\n' +
        '  arrarrstr: Array<Array<string>>,\n' +
        '  mapstrstr: Map<string, string>,\n' +
        '  str: string,\n' +
        '  obj: object,\n' +
        '  Bool: Boolean,\n' +
        '  bool: bool,\n' +
        '  funvoid: ()=> void,\n' +
        '  funsimple: (s:any, b:?bool)=> ?Regexp,\n' +
        '  fun: (s:string, b:?bool)=> ?Regexp,\n' +
        '  fungen: (s:Array<string>, b:?bool)=> ?Regexp,\n' +
        '  fununion: (s:$Either<string,number>, b:?bool)=> ?Regexp,\n' +
        '  prom: Promise,\n' +
        '  prombool: Promise<bool>,\n' +
        '  either: $Either<string, number>,\n' +
        '  eitherarraypromise: $Either<Array<number>, Promise<bool>>,\n' +
        '  foobar: FooBar,\n' +
        '  whoknows: mixed,\n' +
        '  objlit: {},\n' +
        '  qualified: A.B\n' +
        '): Promise { }'
      ])).toBe(
        'function test(\n' +
        '  /*array*/ arr,\n' +
        '  /*array<string>*/ arrstr,\n' +
        '  /*array<array<string>>*/ arrarrstr,\n' +
        '  /*map*/ mapstrstr,\n' +
        '  /*string*/ str,\n' +
        '  /*object*/ obj,\n' +
        '  Bool,\n' +
        '  /*boolean*/ bool,\n' +
        '  /*function*/ funvoid,\n' +
        '  /*function*/ funsimple,\n' +
        '  /*function(string,?boolean):?regexp*/ fun,\n' +
        '  /*function(array<string>,?boolean):?regexp*/ fungen,\n' +
        '  /*function(string|number,?boolean):?regexp*/ fununion,\n' +
        '  /*promise*/ prom,\n' +
        '  /*promise<boolean>*/ prombool,\n' +
        '  /*string|number*/ either,\n' +
        '  /*array<number>|promise<boolean>*/ eitherarraypromise,\n' +
        '  /*FooBar*/ foobar,\n' +
        '  whoknows,\n' +
        '  /*object*/ objlit,\n' +
        '  qualified\n' +
        ') /*promise*/ { }'
      );
    });
  });

  describe('resolving type variables in types', () => {
    it('works on simple primitive aliases', () => {
      expect(transform([
        'type CustomNumber = number;\n' +
        '\n' +
        'function test(\n' +
        '  fooBar: CustomNumber\n' +
        '): Promise { }'
      ])).toBe(
        '                           \n' +
        '\n' +
        'function test(\n' +
        '  /*number*/ fooBar\n' +
        ') /*promise*/ { }'
      );
    });

    it('works on simple generic aliases', () => {
      expect(transform([
        'type CustomArray = Array;\n' +
        '\n' +
        'function test(\n' +
        '  fooBar: CustomArray\n' +
        '): Promise { }'
      ])).toBe(
        '                         \n' +
        '\n' +
        'function test(\n' +
        '  /*array*/ fooBar\n' +
        ') /*promise*/ { }'
      );
    });

    it('works on nested type aliases', () => {
      expect(transform([
        'type CustomArray = Array;\n' +
        'type MoreCustomArray = CustomArray;\n' +
        '\n' +
        'function test(\n' +
        '  fooBar: MoreCustomArray\n' +
        '): Promise { }'
      ])).toBe(
        '                         \n' +
        '                                   \n' +
        '\n' +
        'function test(\n' +
        '  /*array*/ fooBar\n' +
        ') /*promise*/ { }'
      );
    });

    it('hoists type aliases', () => {
      expect(transform([
        'function test(\n' +
        '  fooBar: CustomNumber\n' +
        '): Promise { }\n' +
        '\n'+
        'type CustomNumber = number;'
      ])).toBe(
        'function test(\n' +
        '  /*number*/ fooBar\n' +
        ') /*promise*/ { }\n' +
        '\n' +
        '                           '
      );
    });

    it('hoists type aliases from the same closure', () => {
      expect(transform([
        'function main() {\n' +
        '  function test(\n' +
        '    fooBar: CustomNumber\n' +
        '  ): Promise { }\n' +
        '  type CustomNumber = number;\n' +
        '}'
      ])).toBe(
        'function main() {\n' +
        '  function test(\n' +
        '    /*number*/ fooBar\n' +
        '  ) /*promise*/ { }\n' +
        '                             \n' +
        '}'
      );
    });

    it('ignores type aliases from the nested closures', () => {
      expect(transform([
        'function main() {\n' +
        '  type CustomNumber = number;\n' +
        '}\n' +
        'function test(\n' +
        '  fooBar: CustomNumber\n' +
        '): Promise { }'
      ])).toBe(
        'function main() {\n' +
        '                             \n' +
        '}\n' +
        'function test(\n' +
        '  /*CustomNumber*/ fooBar\n' +
        ') /*promise*/ { }'
      );
    });
  });

  describe('ignoring type variables in types', () => {
    it('works on function declarations', () => {
      expect(transform([
        'function test<T>(): T {}'
      ])).toBe(
        'function test   () /*T*/ {}'
      );
    });

    it('works on function expressions', () => {
      expect(transform([
        'var a = function test<T>(): T {};'
      ])).toBe(
        'var a = function test   () /*T*/ {};'
      );
      expect(transform([
        'var a = function<T>(): T {};'
      ])).toBe(
        'var a = function   () /*T*/ {};'
      );
    });

    it('works on class declarations', () => {
      classSyntaxVisitors =
        require('jstransform/visitors/es6-class-visitors').visitorList;
      expect(transform([
        'class A<T> {',
        '  foo() { var a: T;}',
        '}'
      ], classSyntaxVisitors)).toBe([
        'function A(){"use strict";}',
        '  A.prototype.foo=function() {"use strict"; var /*T*/ a;};',
        ''
      ].join("\n"));
    });

    it('works on class expressions', () => {
      classSyntaxVisitors =
        require('jstransform/visitors/es6-class-visitors').visitorList;
      expect(transform([
        'var B = class A<T> {',
        '  foo() { var a: T;}',
        '}'
      ], classSyntaxVisitors)).toBe([
        'var B = (function(){function A(){"use strict";}',
        '  A.prototype.foo=function() {"use strict"; var /*T*/ a;};',
        'return A;})()'
      ].join("\n"));
    });

    it('works in class methods', () => {
      classSyntaxVisitors =
        require('jstransform/visitors/es6-class-visitors').visitorList;

      expect(transform([
        'class A {',
        '  foo<T>() {',
        '    var a : T;',
        '  }',
        '};'
      ], classSyntaxVisitors)).toBe([
        'function A(){"use strict";}',
        '  A.prototype.foo=function() {"use strict";',
        '    var a ;',
        '  };',
        ';'
      ].join("\n"));
    });

    it('works in object methods', () => {
      // TODO (glevi): There's a bug in esprima that makes type variable
      // declarations not work in object methods
    });

    it('works on multiple levels', () => {
      expect(transform([
        'function a<T>() {',
        '  function b<T, S>(): T {',
        '    var a: T;',
        '    var b: S;',
        '  }',
        '  var a: T;',
        '  var b: S;',
        '}',
        'var a: T;',
        'var b: S;',
      ])).toBe([
        'function a   () {',
        '  function b      () /*T*/ {',
        '    var /*T*/ a;',
        '    var /*S*/ b;',
        '  }',
        '  var /*T*/ a;',
        '  var /*S*/ b;',
        '}',
        'var /*T*/ a;',
        'var /*S*/ b;'
      ].join("\n"));
    });

    it('works on complex types', () => {
      expect(transform([
        'function foo<T>() {',
        '  var a: ?T;',
        '  var b: (x: T) => number;',
        '  var c: (x: number) => T;',
        '  var d: Foo<T>;',
        '}'
      ])).toBe([
        'function foo   () {',
        '  var /*?T*/ a;',
        '  var /*function(T):number*/ b;',
        '  var /*function(number):T*/ c;',
        '  var /*Foo*/ d;',
        '}'
      ].join("\n"));
    });

    it('works on this multiline example', () => {
      // I had this bug where I wasn't properly
      expect(transform([
        'var a = {',
        '  pushState: function<T>(',
        '    data:object,',
        '    title:string,',
        '    uri:T) {}',
        '};'
      ])).toBe([
        'var a = {',
        '  pushState: function   (',
        '    /*object*/ data,',
        '    /*string*/ title,',
        '    /*T*/ uri) {}',
        '};'
      ].join("\n"));
    });
  });
});
