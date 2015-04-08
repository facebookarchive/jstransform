/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';
/*eslint-disable no-undef*/
var visitors = require('../visitors');
var jstransform = require('./jstransform');
var typesSyntax = require('../visitors/type-syntax');
var inlineSourceMap = require('./inline-source-map');

var fs = require('fs');

/**
 * Transforms the given code with the given options.
 *
 * @param {string} code
 * @param {object} options
 * @return {object}
 */
function transform(code, options) {
  // Process options
  var transformOptions = {};

  // transformOptions.harmony = options.harmony;
  // transformOptions.stripTypes = options.stripTypes;
  // transformOptions.sourceMap = options.sourceMap;
  transformOptions.filename = options.sourceFilename;

  if (options.es6module) {
    transformOptions.sourceType = 'module';
  }
  if (options.nonStrictEs6module) {
    transformOptions.sourceType = 'nonStrictModule';
  }

  // Instead of doing any fancy validation, only look for 'es3'. If we have
  // that, then use it. Otherwise use 'es5'.
  transformOptions.es3 = options.target === 'es3';
  transformOptions.es5 = !transformOptions.es3;

  // Determine visitors to use
  var visitorSets = [];

  if (options.react) {
    visitorSets.push('react');
  }

  if (options.harmony) {
    visitorSets.push('harmony');
  }

  if (options.es6) {
    visitorSets.push('es6');
  }

  if (options.es7) {
    visitorSets.push('es7');
  }

  if (options.utility) {
    visitorSets.push('utility');
  }

  if (options.target === 'es3') {
    visitorSets.push('target:es3');
  }


  if (options.stripTypes) {
    // Stripping types needs to happen before the other transforms
    // unfortunately, due to bad interactions. For example,
    // es6-rest-param-visitors conflict with stripping rest param type
    // annotation
    code = jstransform.transform(
      typesSyntax.visitorList,
      code,
      transformOptions
    ).code;
  }

  var visitorList = visitors.getVisitorsBySet(visitorSets);
  var result = jstransform.transform(visitorList, code, transformOptions);

  if (options.sourceMapInline) {
    result.inlineSourceMap = inlineSourceMap(
      result.sourceMap,
      code,
      options.fileName
    );
  }

  return result;
}

function transformFile(file, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  fs.readFile(file, 'utf-8', function(err, contents) {
    if (err) {
      return callback(err, null);
    }

    var result = transform(contents, options);
    callback(result);
  });
}

function transformFileSync(file, options) {
  var contents = fs.readFileSync(file, 'utf-8');
  return transform(contents, options);
}

module.exports = {
  transform: transform,
  transformFile: transformFile,
  transformFileSync: transformFileSync
};

