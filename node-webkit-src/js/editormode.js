/*
TODO: boneyard, inline notes, multi-line notes, 
  correct behavior for markup with preceding spaces, page breaks, lyrics, 
  dual dialogue, other?
*/

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
        
        var match = null;

        if (!state.line) {
          // haven't figured out what this line is yet
          if (state.inBoneyard) {
            if (stream.match(/^.*\*\//)) {
              state.inBoneyard = false;
              return 'boneyard';
            }
            else {
              stream.skipToEnd();
              return 'boneyard';
            }
          }
          if (state.inDialogue) {
            if (stream.eat('(')) {
              state.line = 'parenthetical';
              return 'line-parenthetical';
            }
            else {
              state.line = 'dialogue';
            }
          }
          else if (stream.match(/^(?!\!)(\..*|(?:INT|int|EXT|ext|EST|est|INT|int\.\/EXT|ext|INT|int\/EXT|ext|I\/E|i\/e)(?:\.| ))(.*)$/)) {
            return 'line-scene_heading';
          }
          else if (stream.match(/^(title|credit|authors?|source|draft date|contact|copyright|notes):/i)) {
            state.line = 'title_page';
            return 'line-title_page title_key';
          }
          else if (stream.match(/^\[\[(board|Storyboard Fountain|aspectRatio|dataPath|duration):.*\]\]$/)) {
            return 'line-sf-note';
          }
          else if (stream.match(/^\[\[.*\]\]$/)) {
            return 'line-note';
          }
          else if (stream.match(/^[^a-z]* TO:$/)) {
            return 'line-transition';
          }
          else if (stream.match(/^(?!\!)[A-Z0-9][^a-z]+$/) || stream.match(/^@.*$/)) {
            state.inDialogue = true;
            return 'line-character';
          }
          else if (match = stream.match(/(#+)/)) {
            state.line = 'section';
            return 'line-section line-depth-' + match[0].length + ' markup';
          }
          else if (stream.match(/=/)) {
            state.line = 'synopsis';
            return 'line-synopsis markup';
          }
          else if (stream.match(/>(?=.*<$)/)) {
            state.line = 'centered';
            return 'line-centered markup';
          }
          else if (stream.match(/>/)) {
            state.line = 'transition';
            return 'line-transition markup';
          }
        }

        // rest of the line -- look for bold/italic/underline markup

        // TODO: build a more accurate parser. this will currently break when
        // center and notes are mixed on the same line

        if (stream.match(/\[\[.*\]\]/)) {
          return getTokens() + 'note';
        }

        if (stream.match(/[^_\*]*(?=\[\[.*\]\])/)) {
          return getTokens();
        }

        if (state.lookFor && stream.match(state.lookFor)) {
          return getTokens() + 'markup';
        }

        if (state.line == 'centered' && stream.match(/[^_\*]+(?=<$)/)) {
          state.lookFor = '<';
          return getTokens();
        }

        if (stream.match(/[^_\*]*(?=\/\*)/)) {
          state.inBoneyard = true;
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

        if (state.line == 'centered' && stream.match(/.*(?=<$)/)) {
          state.lookFor = '<';
          return getTokens();
        }

        stream.skipToEnd();
        return getTokens();
      },

      blankLine: function(state) {
        if (state.inDialogue) {
          state.inDialogue = false;
          return 'line-dialogue';
        }
      }
    };
  });

  CodeMirror.registerHelper("fold", "note", function(cm, start) {
    function hasNote(line) {
      if (line < cm.firstLine() || line > cm.lastLine()) return null;
      var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
      if (start.type == 'line-sf-note') {
        return 0;
      }
    }

    var start = start.line, has = hasNote(start);
    if (has == null || hasNote(start - 1) != null) return null;
    for (var end = start; ;) {
      var next = hasNote(end + 2);
      if (next == null) break;
      end += 2;
    }
    return {
      from: CodeMirror.Pos(start, has),
      to: cm.clipPos(CodeMirror.Pos(end))
    };
  });

  CodeMirror.keyMap.fountain = {
    "fallthrough": "default",
    "Enter": function(cm) {
      // by default, enter will start a new script element (by adding an extra
      // line). exceptions to this are when we are typing a character name or
      // when we are in parenthetical or when we are on the title page or when
      // we are at the beginning of a line (just moves the line down by one).
      var pos = cm.getDoc().getCursor();
      var token = cm.getTokenAt(pos);
      var type = token.type;
      if (pos.ch == 0 ||
          type && (
            type.match(/\bcharacter\b/) || 
            type.match(/\bparenthetical\b/) ||
            type.match(/\btitle_page\b/)
          ) ||
          cm.getLine(pos.line).match(/^\s*$/)
      ) {
        return CodeMirror.Pass;
      }
      else {
        cm.replaceSelection("\n\n");
      }
    },
    "Shift-Enter": function(cm) {
      // force a single return
      cm.replaceSelection("\n");
    }
  };
});
