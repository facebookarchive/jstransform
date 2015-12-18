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

/*jshint evil:true, unused:false*/

'use strict';

require('mock-modules').autoMockOff();

var transformFn = require('jstransform').transform;
var visitors = require('../react-jsx-visitors').visitorList;

function transform(code) {
  return transformFn(visitors, code, {inlineReactElements: true});
}

describe('react jsx inline', function() {

  // These are placeholder variables in scope that we can use to assert that a
  // specific variable reference was passed, rather than an object clone of it.
  var x = 123456;
  var y = 789012;
  var z = 345678;

  var expectObjectAssign = function(code) {
    /*eslint-disable no-unused-vars, no-eval*/
    var Component = jest.genMockFunction();
    var Child = jest.genMockFunction();
    var objectAssignMock = jest.genMockFunction();
    React.__spread = objectAssignMock;
    eval(transform(code).code);
    return expect(objectAssignMock);
    /*eslint-enable*/
  };

  var React = {
    createElement: jest.genMockFunction()
  };

  it('should convert simple tags', function() {
    var code = 'var x = <div></div>;';
    var result = 'var x = ({type: "div", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true});';

    expect(transform(code).code).toEqual(result);
  });

  it('should convert simple text', function() {
    var code = 'var x = <div>text</div>;';
    var result = 'var x = ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: "text"}, _isReactElement: true});';

    expect(transform(code).code).toEqual(result);
  });

  it('should have correct comma in nested children', function() {
    var code = [
      'var x = <div>',
      '  <div><br /></div>',
      '  <Component>{foo}<br />{bar}</Component>',
      '  <br />',
      '</div>;'
    ].join('\n');
    var result = [
      'var x = ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: [',
      '  ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: ({type: "br", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true})}, _isReactElement: true}), ',
      '  React.__augmentElement({type: Component, key: void 0, ref: void 0, _owner: null, props: {children: [foo, ({type: "br", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true}), bar]}, _isReactElement: true}), ',
      '  ({type: "br", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true})]',
      '}, _isReactElement: true});'
    ].join('\n');

    expect(transform(code).code).toEqual(result);
  });

  it('should avoid wrapping in extra parens if not needed', function() {
    // Try with a single composite child, wrapped in a div.
    var code = [
      'var x = <div>',
      '  <Component />',
      '</div>;'
    ].join('\n');
    var result = [
      'var x = ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: ',
      '  React.__augmentElement({type: Component, key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true})',
      '}, _isReactElement: true});'
    ].join('\n');

    expect(transform(code).code).toEqual(result);

    // Try with a single interpolated child, wrapped in a div.
    code = [
      'var x = <div>',
      '  {this.props.children}',
      '</div>;'
    ].join('\n');
    result = [
      'var x = ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: ',
      '  this.props.children',
      '}, _isReactElement: true});'
    ].join('\n');
    expect(transform(code).code).toEqual(result);

    // Try with a single interpolated child, wrapped in a composite.
    code = [
      'var x = <Composite>',
      '  {this.props.children}',
      '</Composite>;'
    ].join('\n');
    result = [
      'var x = React.__augmentElement({type: Composite, key: void 0, ref: void 0, _owner: null, props: {children: ',
      '  this.props.children',
      '}, _isReactElement: true});'
    ].join('\n');
    expect(transform(code).code).toEqual(result);

    // Try with a single composite child, wrapped in a composite.
    code = [
      'var x = <Composite>',
      '  <Composite2 />',
      '</Composite>;'
    ].join('\n');
    result = [
      'var x = React.__augmentElement({type: Composite, key: void 0, ref: void 0, _owner: null, props: {children: ',
      '  React.__augmentElement({type: Composite2, key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true})',
      '}, _isReactElement: true});'
    ].join('\n');
    expect(transform(code).code).toEqual(result);
  });

  it('should insert commas after expressions before whitespace', function() {
    var code = [
      'var x =',
      '  <div',
      '    attr1={',
      '      "foo" + "bar"',
      '    }',
      '    attr2={',
      '      "foo" + "bar" +',
      '      ',
      '      "baz" + "bug"',
      '    }',
      '    attr3={',
      '      "foo" + "bar" +',
      '      "baz" + "bug"',
      '      // Extra line here.',
      '    }',
      '    attr4="baz">',
      '  </div>;'
    ].join('\n');
    var result = [
      'var x =',
      '  ({type: "div", key: void 0, ref: void 0, _owner: null, props: {',
      '    attr1: ',
      '      "foo" + "bar", ',
      '    ',
      '    attr2: ',
      '      "foo" + "bar" +',
      '      ',
      '      "baz" + "bug", ',
      '    ',
      '    attr3: ',
      '      "foo" + "bar" +',
      '      "baz" + "bug", ',
      '      // Extra line here.',
      '    ',
      '    attr4: "baz"',
      '  }, _isReactElement: true});'
    ].join('\n');

    expect(transform(code).code).toEqual(result);
  });

  it('should properly handle comments adjacent to children', function() {
    var code = [
      'var x = (',
      '  <div>',
      '    {/* A comment at the beginning */}',
      '    {/* A second comment at the beginning */}',
      '    <span>',
      '      {/* A nested comment */}',
      '    </span>',
      '    {/* A sandwiched comment */}',
      '    <br />',
      '    {/* A comment at the end */}',
      '    {/* A second comment at the end */}',
      '  </div>',
      ');'
    ].join('\n');
    var result = [
      'var x = (',
      '  ({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: [',
      '    /* A comment at the beginning */',
      '    /* A second comment at the beginning */',
      '    ({type: "span", key: void 0, ref: void 0, _owner: null, props: {',
      '      /* A nested comment */',
      '    }, _isReactElement: true}), ',
      '    /* A sandwiched comment */',
      '    ({type: "br", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true})',
      '    /* A comment at the end */',
      '    /* A second comment at the end */]',
      '  }, _isReactElement: true})',
      ');'
    ].join('\n');

    expect(transform(code).code).toBe(result);
  });

  it('should properly handle comments between props', function() {
    var code = [
      'var x = (',
      '  <div',
      '    /* a multi-line',
      '       comment */',
      '    attr1="foo">',
      '    <span // a double-slash comment',
      '      attr2="bar"',
      '    />',
      '  </div>',
      ');'
    ].join('\n');
    var result = [
      'var x = (',
      '  ({type: "div", key: void 0, ref: void 0, _owner: null, props: {',
      '    /* a multi-line',
      '       comment */',
      '    attr1: "foo", children: ',
      '    ({type: "span", key: void 0, ref: void 0, _owner: null, props: {// a double-slash comment',
      '      attr2: "bar"',
      '    }, _isReactElement: true})',
      '  }, _isReactElement: true})',
      ');'
    ].join('\n');

    expect(transform(code).code).toBe(result);
  });

  it('should not strip tags with a single child of &nbsp;', function() {
    var code = [
      '<div>&nbsp;</div>;'
    ].join('\n');
    var result = [
      '({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: "\u00A0"}, _isReactElement: true});'
    ].join('\n');

    expect(transform(code).code).toBe(result);
  });

  it('should not strip &nbsp; even coupled with other whitespace', function() {
    var code = [
      '<div>&nbsp; </div>;'
    ].join('\n');
    var result = [
      '({type: "div", key: void 0, ref: void 0, _owner: null, props: {children: "\u00A0 "}, _isReactElement: true});'
    ].join('\n');

    expect(transform(code).code).toBe(result);
  });

  it('should handle hasOwnProperty correctly', function() {
    var code = '<hasOwnProperty>testing</hasOwnProperty>;';
    var result = '({type: "hasOwnProperty", key: void 0, ref: void 0, _owner: null, props: {children: "testing"}, _isReactElement: true});';
    expect(transform(code).code).toBe(result);
  });

  it('should allow constructor as prop', function() {
    var code = '<Component constructor="foo" />;';
    var result = 'React.__augmentElement({type: Component, key: void 0, ref: void 0, _owner: null, props: {constructor: "foo"}, _isReactElement: true});';

    expect(transform(code).code).toBe(result);
  });

  it('should allow JS namespacing', function() {
    var code = '<Namespace.Component />;';
    var result = 'React.__augmentElement({type: Namespace.Component, key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true});';

    expect(transform(code).code).toBe(result);
  });

  it('should allow deeper JS namespacing', function() {
    var code = '<Namespace.DeepNamespace.Component />;';
    var result = 'React.__augmentElement({type: Namespace.DeepNamespace.Component, key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true});';

    expect(transform(code).code).toBe(result);
  });

  it('should disallow XML namespacing', function() {
    var code = '<Namespace:Component />;';

    expect(() => transform(code)).toThrow();
  });

  it('wraps props in React.__spread for spread attributes', function() {
    var code =
      '<Component { ... x } y\n' +
      '={2 } z />';
    var result =
      'React.createElement(Component, React.__spread({},    x , {y: \n' +
      '2, z: true}))';

    expect(transform(code).code).toBe(result);
  });

  it('adds appropriate newlines when using spread attribute', function() {
    var code =
      '<Component\n' +
      '  {...this.props}\n' +
      '  sound="moo" />';
    var result =
      'React.createElement(Component, React.__spread({}, \n' +
      '  this.props, \n' +
      '  {sound: "moo"}))';

    expect(transform(code).code).toBe(result);
  });

  it('handles overparenthesized JS', function() {
    var code =
    '<foo a={(b)} c={(d)}>Foo {(e+f //A line comment\n' +
        '/* A multiline comment */)\n' +
      '} bar\n' +
    '</foo>';
    var result = '({type: "foo", key: void 0, ref: void 0, _owner: null, props: {a: (b), c: (d), children: ["Foo ", (e+f //A line comment\n' +
            '/* A multiline comment */), \n' +
    '" bar"\n' +
    ']}, _isReactElement: true})';
    expect(transform(code).code).toBe(result);
  });

  it('should transform known hyphenated tags', function() {
    var code = '<font-face />;';
    var result = '({type: "font-face", key: void 0, ref: void 0, _owner: null, props: {}, _isReactElement: true});';

    expect(transform(code).code).toBe(result);
  });

  it('should not throw for unknown hyphenated tags', function() {
    var code = '<x-component />;';
    expect(function() {
      transform(code);
    }).not.toThrow();
  });

  it('should inline key', function() {
    var code = '<div className="frozen" key="me" />;';
    var result = '({type: "div", key: "me", ref: void 0, _owner: null, props: {className: "frozen"}, _isReactElement: true});';
    expect(transform(code).code).toBe(result);

    var code = '<div className="frozen" key="me" rel="mouse" />;';
    var result = '({type: "div", key: "me", ref: void 0, _owner: null, props: {className: "frozen", rel: "mouse"}, _isReactElement: true});';
    expect(transform(code).code).toBe(result);

    var code = '<div className="frozen" key="me">moose</div>;';
    var result = '({type: "div", key: "me", ref: void 0, _owner: null, props: {className: "frozen", children: "moose"}, _isReactElement: true});';
    expect(transform(code).code).toBe(result);
  });

  it('should not inline ref', function() {
    var code = '<div className="frozen" ref="me" />;';
    var result = 'React.createElement("div", {className: "frozen", ref: "me"});';
    expect(transform(code).code).toBe(result);
  });

});
