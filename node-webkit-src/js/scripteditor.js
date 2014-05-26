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

  var propagate = function() {
    toggleExpandNotes(expandNotes);
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
      scanUp: false,
      clearOnClick: false,
      clearOnEnter: false,
      atomic: true
    };
    editor.getDoc().on('change', debounce(propagate, 250));
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
    editor.focus();
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
