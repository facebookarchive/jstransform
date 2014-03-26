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

/*jshint node:true*/

/**
 * just a list of string templates used for spread operator
 */

module.exports = {
  spreadLiteralBegin: '(function(array) { if (Array.isArray(array)) { return array }; throw new TypeError(array + \' is not an array\'); })(',
  spreadLiteralEnd: ')',
  
  outerArrayBegin: 'Array.prototype.concat.apply([],',
  outerArrayEnd: ')',
  
  callExpressionBegin: function (context) {
    return '.apply(context, Array.prototype.concat.apply([],'.replace('context', context);
  },
  callExpressionEnd: '))',
  
  closureStart: '(function() { ',
  closureEnd: '})()'
};