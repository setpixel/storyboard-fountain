;(function() {
  'use strict';

  var events = require('events');

  var editor = null;
  var emitter = new events.EventEmitter();
  var expandNotes = false;
  var autoIndent = true;

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

  var init = function(text) {
    window.editor = editor = CodeMirror($('#scripttext')[0], {
      value: text,
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
    toggleExpandNotes(false);
    toggleAutoIndent(true);
    return editor;
  };

  var scriptEditor = window.scriptEditor = {
    emitter: emitter,
    init: init,
    toggleAutoIndent: toggleAutoIndent,
    toggleExpandNotes: toggleExpandNotes
  };

  // force initial event fires
  $(document).ready(function() {
    process.nextTick(function() {
    });
  });

}).call(this);
