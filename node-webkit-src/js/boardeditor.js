// allow for editing script elements in the board view
;(function() {

  var events = require('events');

  // for edit events
  var emitter = new events.EventEmitter();

  // the current state of the board editor
  var editing = null;

  // return a chunk and part given an html element from the board view that 
  // wraps a script element
  var moduleElementToChunkAndPart = function(element) {
    var id = parseInt($(element).attr('data-id'));
    if (!id) return null;
    var cursor = fountainManager.getCursorForAtom(id);
    if (cursor && cursor.chunkIndex !== null) {
      return {
        chunkIndex: cursor.chunkIndex, 
        part: $(element).attr('data-part')
      };
    }
    else {
      return null;
    }
  };

  var editNext = function() {
    if (!editing) return;

    var part = null;
    var chunk = fountainManager.getScriptChunk(editing.chunkIndex);
    if (!chunk) return null;

    switch (chunk.type) {
      case 'dialogue':
      case 'parenthetical':
        if (editing.part == 'character') {
          part = 'text';
        }
        break;
    }

    if (part) {
      endEditing(true);
      startEditing(chunk.chunkIndex, part);
    }
  };

  var editPrev = function() {
    if (!editing) return;

    var part = null;
    var chunk = fountainManager.getScriptChunk(editing.chunkIndex);

    switch (chunk.type) {
      case 'dialogue':
      case 'parenthetical':
        if (editing.part == 'text') {
          part = 'character';
        }
        break;
    }

    if (part) {
      endEditing(true);
      startEditing(chunk.chunkIndex, part);
    }
  };

  var startEditing = function(chunkIndex, part) {
    if (editing) endEditing();

    if (arguments.length == 0) {
      chunkIndex = fountainManager.getCursor().chunkIndex;
    }
    part = part || 'text';

    var chunk = fountainManager.getScriptChunk(chunkIndex);
    var $element = $(".editable[data-part='" + part + "']", ".caption");
    var $editor = $('.edit', $element);
    $('.view', $element).hide();
    $editor.show();

    // stop enter from bubbling up to the ui handling code, whose keydown handler is 
    // being called after the editor's and starting an edit in the selected 
    // element
    $('.caption').keydown(function(e) {
      switch (e.keyCode) {
        case 13:  // enter
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    var value = null;
    switch (part) {
      case 'character':
        value = chunk.character;
        break;
      case 'text':
        value = chunk.text;
        break;
    }

    var editor = CodeMirror($editor[0], {
      value: fountainHelpers.htmlToMarkup(value),
      mode: {
        name: 'fountain-snippet',
        lineClass: part
      },
      viewportMargin: Infinity,
      theme: 'neo-snippet',
      lineWrapping: true,
      keyMap: 'fountain-snippet',
      autofocus: true
    });
    editor.on('blur', function() {
      // delayed so the Esc key, if pressed, can call without saving first
      setTimeout(function() { 
        if (editing && editing.editor == editor) {
          endEditing(true); 
        }
      }, 0);
    });

    // set the editing state
    editing = {
      chunkIndex: chunkIndex,
      part: part,
      editor: editor
    };
  };

  var endEditing = function(save) {
    if (!editing) return;

    if (save) {
      var value = fountainHelpers.markupToHtml(editing.editor.getDoc().getValue());
      var chunk = fountainManager.getScriptChunk(editing.chunkIndex);
      var outlineChunk = fountainManager.getOutlineItem(parseInt(chunk.scene)-1);
      switch (editing.part) {
        case 'character':
          chunk.character = value;
          break;
        case 'text':
          chunk.text = value;
          break;
      }
      // TODO: update any summary calculations that will change as a result
    }
    var $el = $('.caption .editable[data-part="' + editing.part + '"]')
    $('.edit', $el).html('').hide();
    $('.view', $el).show();
    editing = null;
    if (save) {
      $('.view', $el).html(value);
      emitter.emit('edit:finish');
    }
  };

  // if we were editing something and the underlying element objects changed,
  // ensure we are still editing
  var keepEditing = function() {
    if (editing) {
      startEditing(editing.chunkIndex, editing.part);
    }
  };

  window.boardEditor = {
    startEditing: startEditing,
    keepEditing: keepEditing,
    endEditing: endEditing,
    editNext: editNext,
    editPrev: editPrev,
    isEditing: function() { return !!editing; },
    emitter: emitter
  };

  // handle starting an edit on a script element
  $(".caption").on("dblclick", ".editable", function(e) {
    e.stopPropagation();
    var data = moduleElementToChunkAndPart(this);
    if (!data) return;
    startEditing(data.chunkIndex, data.part);
  });

}).call(this);
