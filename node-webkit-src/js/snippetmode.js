$(document).ready(function() {
  CodeMirror.defineMode('fountain-snippet', function(config, parserConfig) {
    return {
      startState: function() { return {
        base: []
      }; },
      token: function(stream, state) {
        var getTokens = function() {
          var tokens = '';
          if (state.line) tokens += 'line-' + state.line + ' ';
          if (state.isBold) tokens += 'bold ';
          if (state.isItalic) tokens += 'italic ';
          if (state.isUnderline) tokens += 'underline ';
          return tokens;
        }

        if (stream.sol()) {
          state.line = parserConfig.lineClass;
          state.isUnderline = false;
          state.isBold = false;
          state.isItalic = false;
          // begining of line, skip ws
          if (stream.eatSpace()) return null;
        }
        
        var match = null;

        // rest of the line -- look for bold/italic/underline markup

        // match a whole comment
        if (stream.match(/\[\[.*\]\]/)) {
          return getTokens() + 'note';
        }
        // match up to the beginning of a comment
        if (stream.match(/[^_\*]*(?=\[\[.*\]\])/)) {
          return getTokens();
        }

        if (stream.match(/[^_\*]+/)) {
          return getTokens();
        }
        if (state.isUnderline && stream.eat('_')) {
          state.isUnderline = false;
          return getTokens() + 'markup';
        }
        if (!state.isUnderline && stream.match(/_(?=[^_]*_)/)) {
          var tokens = getTokens() + 'markup';
          state.isUnderline = true;
          return tokens;
        }
        if (state.isItalic && stream.match(/\*/)) {
          state.isItalic = false;
          return getTokens() + 'markup';
        }
        if (state.isBold && stream.match(/\*\*/)) {
          state.isBold = false;
          return getTokens() + 'markup';
        }
        if (!state.isBold && stream.match(/\*\*(?=.+\*\*)/)) {
          var tokens = getTokens() + 'markup';
          state.isBold = true;
          return tokens;
        }
        if (!state.isItalic && stream.match(/\*(?=[^\*]+\*)/)) {
          var tokens = getTokens() + 'markup';
          state.isItalic = true;
          return tokens;
        }

        stream.skipToEnd();
        return getTokens();
      },

      blankLine: function(state) {
        return 'line-' + parserConfig.lineClass;
      }
    };
  });

  var currentEditor = function() {
    if (elementEditor.isEditing()) {
      return elementEditor;
    }
    else {
      return boardEditor;
    }
  };

  CodeMirror.keyMap['fountain-snippet'] = {
    "fallthrough": "default",
    "Esc": function(cm) {
      // exit editing
      currentEditor().endEditing(false);
      return false;
    },
    "Enter": function(cm) {
      // exit editing
      currentEditor().endEditing(true);
      return false;
    },
    "Shift-Enter": function(cm) {
      // force a single return
      cm.replaceSelection("\n");
      return false;
    },
    "Up": function(cm) {
      var doc = cm.getDoc();
      var startLine = doc.getCursor().line;
      cm.execCommand("goLineUp");
      var currIndex = doc.indexFromPos(doc.getCursor());
      var nextIndex = doc.indexFromPos(doc.posFromIndex(currIndex - 1));
      if (doc.getCursor().line == startLine && currIndex == nextIndex) {
        currentEditor().editPrev();
      }
      return false;
    },
    "Down": function(cm) {
      var doc = cm.getDoc();
      var startLine = doc.getCursor().line;
      cm.execCommand("goLineDown");
      var currIndex = doc.indexFromPos(doc.getCursor());
      var nextIndex = doc.indexFromPos(doc.posFromIndex(currIndex + 1));
      if (doc.getCursor().line == startLine && currIndex == nextIndex) {
        currentEditor().editNext();
      }
      return false;
    }
  };
});
