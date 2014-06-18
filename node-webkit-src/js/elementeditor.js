// allow for editing script elements in the left sidebar
;(function() {

  var events = require('events');

  // for edit events
  var emitter = new events.EventEmitter();

  // the current state of the left-sidebar editor
  var editing = null;

  // return a chunk and part given an html element from the left-sidepane that 
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

  var pickPrevEditableChunk = function() {
    var chunkIndex = editing.chunkIndex - 1;
    while (true) {
      var chunk = fountainManager.getScriptChunk(chunkIndex);
      if (!chunk) return null;
      switch (chunk.type) {
        case 'action':
        case 'dialogue':
        case 'parenthetical':
          return {chunk: chunk, part: 'text'};
        case 'scene_heading':
          return {chunk: chunk, part: 'synopsis'};
        default:
          chunkIndex -= 1;
          break;
      }
    }
  };

  var pickNextEditableChunk = function() {
    var chunkIndex = editing.chunkIndex + 1;
    while (true) {
      var chunk = fountainManager.getScriptChunk(chunkIndex);
      if (!chunk) return null;
      switch (chunk.type) {
        case 'action':
          return {chunk: chunk, part: 'text'};
        case 'dialogue':
        case 'parenthetical':
          return {chunk: chunk, part: 'character'};
        case 'scene_heading':
          return {chunk: chunk, part: 'slug'};
        default:
          chunkIndex += 1;
          break;
      }
    }
  };

  var editNext = function() {
    if (!editing) return;

    var chunk = fountainManager.getScriptChunk(editing.chunkIndex);
    var newChunk = null;
    var newPart = null;

    switch (editing.part) {
      case 'slug':
        newChunk = chunk;
        newPart = 'title';
        break;
      case 'title':
        newChunk = chunk;
        newPart = 'synopsis';
        break;
      case 'character':
        newChunk = chunk;
        newPart = 'text';
        break;
      case 'synopsis':
      case 'text':
        var pick = pickNextEditableChunk();
        if (pick) {
          newChunk = pick.chunk;
          newPart = pick.part;
        }
        else {
          return;
        }
        break;
    }

    endEditing(true);
    startEditing(newChunk.chunkIndex, newPart);
  };

  var editPrev = function() {
    if (!editing) return;

    var chunk = fountainManager.getScriptChunk(editing.chunkIndex);
    var newChunk = null;
    var newPart = null;

    switch (editing.part) {
      case 'character':
      case 'slug':
        var pick = pickPrevEditableChunk();
        if (pick) {
          newChunk = pick.chunk;
          newPart = pick.part;
        }
        else {
          return;
        }
        break;
      case 'title':
        newChunk = chunk;
        newPart = 'slug';
        break;
      case 'synopsis':
        newChunk = chunk;
        newPart = 'title';
        break;
      case 'text':
        if (chunk.type == 'action') {
          var pick = pickPrevEditableChunk();
          if (pick) {
            newChunk = pick.chunk;
            newPart = pick.part;
          }
          else {
            return;
          }
        }
        else {
          newChunk = chunk;
          newPart = 'character';
        }
        break;
    }

    endEditing(true);
    startEditing(newChunk.chunkIndex, newPart);
  };

  var startEditing = function(chunkIndex, part) {
    if (editing) endEditing();

    if (arguments.length == 0) {
      chunkIndex = fountainManager.getCursor().chunkIndex;
    }
    part = part || 'text';

    var chunk = fountainManager.getScriptChunk(chunkIndex);
    var $element = $(".editable[data-part='" + part + "']", "#module-script-" + chunk.id);
    var $editor = $('.edit', $element);
    $('.view', $element).hide();
    $editor.show();

    // stop enter from bubbling up to the ui handling code, whose keydown handler is 
    // being called after the editor's and starting an edit in the selected 
    // element
    $('#script').keydown(function(e) {
      switch (e.keyCode) {
        case 13:  // enter
          e.preventDefault();
          e.stopPropagation();
          break;
      }
    });

    var value = null;
    switch (part) {
      case 'slug':
        value = chunk.text;
        break;
      case 'title':
        value = fountainManager.getOutlineItem(parseInt(chunk.scene)-1).title;
        break;
      case 'synopsis':
        value = fountainManager.getOutlineItem(parseInt(chunk.scene)-1).synopsis;
        break;
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
      id: $element.attr('data-id'),
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
        case 'slug':
          chunk.text = value;
          outlineChunk.slugline = value;
          break;
        case 'title':
          fountainManager.getAtom(outlineChunk.titleId).text = value;
          outlineChunk.title = value;
          break;
        case 'synopsis':
          fountainManager.getAtom(outlineChunk.synopsisId).synopsis = value;
          outlineChunk.synopsis = value;
          break;
        case 'character':
          chunk.character = value;
          break;
        case 'text':
          chunk.text = value;
          break;
      }
      // TODO: update any summary calculations that will change as a result
    }
    var $el = $('.boards-list [data-id="' + editing.id + '"][data-part="' + editing.part + '"]')
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

  window.elementEditor = {
    startEditing: startEditing,
    keepEditing: keepEditing,
    endEditing: endEditing,
    editNext: editNext,
    editPrev: editPrev,
    isEditing: function() { return !!editing; },
    emitter: emitter
  };

  // handle starting an edit on a script element
  $(".boards-list").on("dblclick", ".module .editable", function(e) {
    e.stopPropagation();
    var data = moduleElementToChunkAndPart(this);
    if (!data) return;
    startEditing(data.chunkIndex, data.part);
  });

}).call(this);
