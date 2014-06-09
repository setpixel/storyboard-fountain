;(function() {

  window.log = function() {
    //if (!/debug=1/.test(window.location.href)) return;
    console.log.apply(console, arguments);
  }

  // from: http://davidwalsh.name/javascript-debounce-function
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  window.debounce = function(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      }, wait);
      if (immediate && !timeout) func.apply(context, args);
    };
  };

  //console.log = function() {};

  window.getSetting = function(name, defaultValue) {
    var val = localStorage.getItem(name);
    if (typeof(val) === 'undefined' || val === null) {
      return defaultValue;
    }
    else {
      switch (typeof(defaultValue)) {
        case 'number':
          return parseFloat(val);
        case 'boolean':
          return val === 'true';
        case 'object':
          return JSON.parse(val);
        default:
          return val;
      }
    }
  };

}).call(this);
