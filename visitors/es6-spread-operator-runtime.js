/*global window, self */
(function (global) {
  
  function assertSpreadElement(array) {
      if (Array.isArray(array)) {
        return array;
      }
      throw new TypeError(array + ' is not an array');
  }
    
  function executeNewExpression(func, args) {
    var result = Object.create(func.prototype);
    var funcResult = func.apply(result, args);
    return typeof funcResult === 'undefined' ? result : funcResult;
  }
  
  global.____JSTRANSFORM_SPREAD_RUNTIME____ = {
    assertSpreadElement: assertSpreadElement,
    executeNewExpression: executeNewExpression
  };
})((function () {
  if (typeof window !== 'undefined') {
    return window;
  } else if (typeof global !== 'undefined') {
    return global;
  } else if (typeof self !== 'undefined') {
    return self;
  }
  return this;
})());
