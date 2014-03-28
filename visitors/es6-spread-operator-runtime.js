/*global window, self */
(function (global) {
  
  function assertSpreadElement(array) {
      if (Array.isArray(array)) {
        return array;
      }
      throw new TypeError(array + ' is not an array');
  }
  
  global.____JSTRANSFORM_SPREAD_RUNTIME____ = {
    assertSpreadElement: assertSpreadElement
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
