;(function() {
  'use strict';

  var events = require('events');

  var editor = null;
  var emitter = new events.EventEmitter();
  var expandNotes = false;
  var autoIndent = true;

  // from: http://davidwalsh.name/javascript-debounce-function
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  var debounce = function(func, wait, immediate) {
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

  var toggleExpandNotes = function(value) {
    if (typeof(value) !== 'undefined') {
      expandNotes = value;
    }
    else {
      expandNotes = !expandNotes;
    }
    if (expandNotes) {
      editor.execCommand('unfoldAll');
    }
    else {
      editor.execCommand('foldAll');
    }
    emitter.emit('expandNotes:change', expandNotes);
  };

  var toggleAutoIndent = function(value) {
    if (value) {
      autoIndent = value;
    }
    else {
      autoIndent = !autoIndent;
    }
    if (autoIndent) {
      $('.CodeMirror').addClass('auto-indent');
    }
    else {
      $('.CodeMirror').removeClass('auto-indent');
    }
    emitter.emit('autoIndent:change', autoIndent);
  };

  var propagate = function() {
    fountainManager.loadChange(editor.getDoc().getValue());
  };

  var toEdit = ' ';

  var init = function() {
    window.editor = editor = CodeMirror($('#scripttext')[0], {
      value: toEdit,
      mode: 'fountain',
      viewportMargin: Infinity,
      theme: 'neo',
      lineWrapping: true
    })
    editor.options.foldOptions = {
      rangeFinder: CodeMirror.fold.note,
      widget: "[[Storyboards]]",
      minFoldSize: 0,
      scanUp: false
    };
    editor.on('change', debounce(propagate, 250));
    toggleExpandNotes(false);
    toggleAutoIndent(true);
  };

  fountainManager.emitter.on('script:change', function(text, oldText, fromScriptEditor) {
    if (fromScriptEditor) return;
    console.log('script:change');
    if (editor) {
      editor.getDoc().setValue(text);
      toggleExpandNotes(expandNotes);
    }
    else {
      toEdit = text;
    }
  });

  var refresh = function() {
    if (editor) editor.refresh();
  };

  var scriptEditor = window.scriptEditor = {
    emitter: emitter,
    toggleAutoIndent: toggleAutoIndent,
    getAutoIndent: function() { return autoIndent; },
    toggleExpandNotes: toggleExpandNotes,
    getExpandNotes: function() { return expandNotes; },
    refresh: refresh
  };

  // force initial event fires
  $(document).ready(function() {
    init();
  });

}).call(this);
