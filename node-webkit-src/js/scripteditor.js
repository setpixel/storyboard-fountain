;(function() {
  'use strict';

  var events = require('events');

  var editor = null;
  var emitter = new events.EventEmitter();
  var expandNotes = getSetting('script.expand-notes', false);
  var autoIndent = getSetting('script.auto-indent', true);

  var toggleExpandNotes = function(value) {
    if (typeof(value) !== 'undefined') {
      expandNotes = value;
    }
    else {
      expandNotes = !expandNotes;
    }
    localStorage.setItem('script.expand-notes', '' + expandNotes);
    if (expandNotes) {
      editor.execCommand('unfoldAll');
    }
    else {
      editor.execCommand('foldAll');
    }
    emitter.emit('expandNotes:change', expandNotes);
  };

  var toggleAutoIndent = function(value) {
    if (arguments.length > 0) {
      autoIndent = value;
    }
    else {
      autoIndent = !autoIndent;
    }
    localStorage.setItem('script.auto-indent', '' + autoIndent);
    if (autoIndent) {
      $('.CodeMirror').addClass('auto-indent');
    }
    else {
      $('.CodeMirror').removeClass('auto-indent');
    }
    emitter.emit('autoIndent:change', autoIndent);
  };

  var cancelDebouncePropagate = false;

  var propagate = function(force) {
    toggleExpandNotes(expandNotes);
    if (cancelDebouncePropagate) {
      cancelDebouncePropagate = false;
      return;
    }
    // total hack. don't propagate a board change back to fountain manager
    if (force || ui.getActiveState() == 'script') {
      fountainManager.loadChange(editor.getDoc().getValue());
    }
  };

  var toEdit = ' ';

  var init = function() {
    window.editor = editor = CodeMirror($('#scripttext')[0], {
      value: toEdit,
      mode: 'fountain',
      viewportMargin: 5,
      theme: 'neo',
      lineWrapping: true,
      keyMap: 'fountain',
      gutters: '',
      cursorActivity: cursorMove
    })
    editor.options.foldOptions = {
      rangeFinder: CodeMirror.fold.note,
      widget: "[[Notes]]",
      minFoldSize: 0,
      scanUp: false,
      clearOnClick: false,
      clearOnEnter: false,
      atomic: true
    };

    editor.on("cursorActivity", cursorMove);

    editor.getDoc().on('change', debounce(propagate, 3000));
    ui.emitter.on('activeState:change', function(state) {
      switch (state) {
        case 'boards':
          cancelDebouncePropagate = true;
          propagate(true);
          break;

        case 'script':
          cancelDebouncePropagate = false;
          refresh();
          break;
      }
    });
    toggleExpandNotes(expandNotes);
    toggleAutoIndent(autoIndent);
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




  var cursorMove = function() {
    var text = editor.doc.getLine(editor.doc.getCursor().line)

    var chunks = fountainManager.getScriptChunks();
    
    var findCount = 0;
    var chunkIndex = 0;
    for (var i=0; i<chunks.length; i++) {
      if (chunks[i].text == text) {
        findCount++;
        chunkIndex = i;
      }
    }
    if (findCount == 1) {
      fountainManager.selectChunkAndBoard(chunkIndex);
    }

            



  }


  var refresh = function() {
    if (editor) editor.refresh();
    editor.focus();
  };

  var flushChanges = function(next) {
    fountainManager.loadChange(editor.getDoc().getValue(), next);
  };

  var scriptEditor = window.scriptEditor = {
    emitter: emitter,
    toggleAutoIndent: toggleAutoIndent,
    getAutoIndent: function() { return autoIndent; },
    toggleExpandNotes: toggleExpandNotes,
    getExpandNotes: function() { return expandNotes; },
    refresh: refresh,
    flushChanges: flushChanges
  };

  // force initial event fires
  $(document).ready(function() {
    init();
  });

}).call(this);
