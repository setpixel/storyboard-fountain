$(document).ready(function() {
  CodeMirror.defineMode('fountain', function(config, parserConfig) {
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
          state.line = null;
          state.isUnderline = false;
          state.isBold = false;
          state.isItalic = false;
          // begining of line, skip ws
          if (stream.eatSpace()) return null;
        }
        
        if (!state.line) {
          // haven't figured out what this line is yet
          if (state.inDialogue) {
            if (stream.eat('(')) {
              state.line = 'parenthetical';
              return 'line-parenthetical';
            }
            else {
              state.line = 'dialogue';
            }
          }
          else if (stream.match(/^(\..*|(?:INT|int|EXT|ext|EST|est|INT|int\.\/EXT|ext|INT|int\/EXT|ext|I\/E|i\/e)(?:\.| ))(.*)$/)) {
            return 'line-scene_heading';
          }
          else if (stream.match(/^(title|credit|authors?|source|draft date|contact|copyright|notes):/i)) {
            state.line = 'title_page';
            return 'line-title_page title_key';
          }
          else if (stream.match(/^\[\[[^\]]*\]\]$/)) {
            return 'line-note';
          }
          else if (stream.match(/^[^a-z]* TO:$/)) {
            return 'line-transition';
          }
          else if (stream.match(/^[A-Z0-9][^a-z]+$/)) {
            state.inDialogue = true;
            return 'line-character';
          }
          else if (stream.match(/# /)) {
            state.line = 'act';
            return 'line-act markup';
          }
          else if (stream.match(/## /)) {
            state.line = 'sequence';
            return 'line-sequence markup';
          }
          else if (stream.match(/### /)) {
            state.line = 'scene';
            return 'line-scene markup';
          }
          else if (stream.match(/= /)) {
            state.line = 'synopsis';
            return 'line-synopsis markup';
          }
          else if (stream.match(/>(?=\s.*\s<$)/)) {
            state.line = 'centered';
            return 'line-centered markup';
          }
          else if (stream.match(/> /)) {
            state.line = 'transition';
            return 'line-transition markup';
          }
        }

        // TODO: comments/boneyard

        // rest of the line -- look for bold/italic/underline markup

        if (state.lookFor && stream.match(state.lookFor)) {
          return getTokens() + 'markup';
        }

        if (state.line == 'centered' && stream.match(/[^_\*]+(?= <$)/)) {
          state.lookFor = ' <';
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

        if (state.line == 'centered' && stream.match(/.*(?= <$)/)) {
          state.lookFor = ' <';
          return getTokens();
        }

        stream.skipToEnd();
        return getTokens();
      },

      blankLine: function(state) {
        state.inDialogue = false;
      }
    };
  });

  CodeMirror.registerHelper("fold", "note", function(cm, start) {
    function hasNote(line) {
      if (line < cm.firstLine() || line > cm.lastLine()) return null;
      var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
      if (start.type == 'line-note') {
        return 0;
      }
    }

    var start = start.line, has = hasNote(start);
    if (has == null || hasNote(start - 1) != null) return null;
    for (var end = start;;) {
      var next = hasNote(end + 2);
      if (next == null) break;
      end += 2;
    }
    return {from: CodeMirror.Pos(start, has),
            to: cm.clipPos(CodeMirror.Pos(end))};
  });
});
