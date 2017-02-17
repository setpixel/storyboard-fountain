;(function() {
  
  var gui = require('nw.gui');
  var events = require('events');
  var _ = require('underscore');

  var emitter = new events.EventEmitter();

  var scriptText = '';

  var title = '';
  var author = '';
  var settings = {aspectRatio: 2.35};
  var stats = {};
  var script = [];
  var scriptChunks = [];
  var imageList = [];

  var scriptCursorIndex = 1;
  var scriptImageCursorIndex = 0;

  var atomToChunk = {};
  var atomToBoard = {};

  var loadingChange = false;

  // html templates used for rendering the left-sidebar
  var templates = {};
  $(document).ready(function() {
    templates = {
      'scene_heading': Handlebars.compile($('#scene-heading-element').html()),
      'action': Handlebars.compile($('#action-element').html()),
      'dialogue': Handlebars.compile($('#character-element').html()),
      'parenthetical': Handlebars.compile($('#character-element').html())
    };
  });

  // html templates used for rendering the board view
  var boardTemplates = {};
  $(document).ready(function() {
    boardTemplates = {
      'action': Handlebars.compile($('#text-boardview-element').html()),
      'dialogue': Handlebars.compile($('#character-boardview-element').html()),
      'parenthetical': Handlebars.compile($('#character-boardview-element').html())
    };
  });

  var load = function(data) {
    if (data.script == scriptText) return;
    var oldScriptText = scriptText;
    scriptText = data.script;
    emitter.emit('script:change', scriptText, oldScriptText);
    loadingChange = false;
    parseFountain(data.script);
  }

  var loadChange = function(text, next) {
    if (text == scriptText) {
      if (next) next(null, false);
      return;
    }
    var oldScriptText = scriptText;
    scriptText = text;
    emitter.emit('script:change', scriptText, oldScriptText, true);
    loadingChange = true;
    parseFountain(text);
    storyboardState.saveScript(next);
  }

  var loadNonEditChange = function(text, next) {
    if (text == scriptText) {
      if (next) next(null, false);
      return;
    }
    var oldScriptText = scriptText;
    scriptText = text;
    emitter.emit('script:change', scriptText, oldScriptText);
    loadingChange = true;
    parseFountain(text);
    storyboardState.saveScript(next);
  }

  aspectRatio.emitter.on('aspectRatio:change', function(ratio) {
    if (ratio == settings.aspectRatio) return;
    loadNonEditChange(exportScriptText());
  });

  elementEditor.emitter.on('edit:finish', function() {
    loadNonEditChange(exportScriptText());
  });

  boardEditor.emitter.on('edit:finish', function() {
    loadNonEditChange(exportScriptText());
  });

  $(document).ready(function() {
    // handle clicking on a board thumb
    $(".boards-list").on("click", ".module.selectable img", imageClickHandler);

    // handle clicking on a script element
    $(".boards-list").on("click", ".module.selectable", function(e) {
      e.stopPropagation();
      var id = parseInt($(this).attr('id').split("-")[2]);
      if (player.getFullState().state == 'playing') {
        selectChunk(atomToChunk[id].chunkIndex);
        var atom = getAtomForCursor();
        var update = timeline.getUpdateForAtom(atom);
        player.setPlayhead(update.time);
      }
      else if (recorder.getState() == 'paused') {
        selectChunk(atomToChunk[id].chunkIndex, false, true);
      }
    });
  });

  var parseFountain = function (fountainText) {
    var tokens = "";
    fountain.parse(fountainText, true, function (output) {
      tokens = output.tokens;
    });


    //paginator(tokens);
    script = createScript(tokens);

    timeline.buildUpdates();

    getUniqueLocations(script);

    outline = createOutline(script);
    
    characters = extractCharacters(script);

    $("#scene-colorbars").html(renderScenes(outline));

    $("#script").html(renderScript());

    fountainManager.renderScenes();

    // load initial selection
    scriptCursorIndex = parseInt(localStorage.getItem('scriptCursorIndex') || 0) || 0;
    scriptImageCursorIndex = parseInt(localStorage.getItem('scriptImageCursorIndex') || 0) || 0;

    selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex, false, false);

    elementEditor.keepEditing();
    boardEditor.keepEditing();

    // printManager.scenePrint(61, {columns: 5, orientation: 'landscape',
    //   boardWorksheet: false,
    //   printWorksheetLines: true,
    //   worksheetLines: 3,
    //   repeatEmptyBoards: false,
    //   drawGuides: true,
    //   printHeader: true,
    //   margin: 21,
    //   innerMargin: 7,
    //   headerHeight: 30,
    //   textHeight: 20
    // });
    
    printManager.outlinePrint({
      columns: 4, 
      includeBeats: true,
      orientation: 'landscape',
      printWorksheetLines: false,
      worksheetLines: 3,
      drawGuides: true,
      printHeader: true,
      margin: 21,
      innerMargin: 7,
      headerHeight: 30,
    });
  
    // printManager.scriptPrint({
    //   printHeader: true,
    //   printBoards: true,
    //   printElementLabels: true,
    //   leftMarginOffset: 0.3*72,
    //   topMargin: 1.25*72,
    //   monoFontSize: 11.4,
    //   lineGap: -0.10,
    //   lineNumberBreak: 53,
    // });


  };

  var chunkText = function(chunk) {
    var template = boardTemplates[chunk.type];
    if (template) {
      return template({chunk: chunk});
    }
    else {
      return '';
    }
  }



  // TODO: skipSelect is needed b/c we can't select the chunk on initial load without causing an error
  var selectChunkAndBoard = function(chunkIndex, boardIndex, skipSelect, scrollToTop, click) {
    if (canSelectChunk(chunkIndex)) {
      scriptCursorIndex = chunkIndex;
      scriptImageCursorIndex = boardIndex;
      localStorage.setItem('scriptCursorIndex', scriptCursorIndex);
      localStorage.setItem('scriptImageCursorIndex', scriptImageCursorIndex);


      var chunk = scriptChunks[scriptCursorIndex];
      if (chunk) {

        // if (click) {
        //   //console.log(chunk.text)
        //   var find = window.editor.getSearchCursor(chunk.text.split("<br />")[0]);

        //   console.log(chunk.text.split("<br />")[0]);
          
        //   if (find.find()) {
        //     var pos = find.pos.from;
            
        //     if (find.find()) {

        //     } else {
        //       if ($("#scripttext").css('display') == 'none') {
        //         window.editor.setCursor({line: pos.line, ch:0}, 0, {scroll: true});
        //         window.editor.scrollIntoView(pos, 300);
                
        //          //$("#scripttext").css('z',  window.editor.charCoords(pos, "local").top-300);
        //       } else {
        //         window.editor.setCursor({line: pos.line, ch:0});
        //         window.editor.scrollIntoView(pos);
        //         $("#scripttext").animate({z: window.editor.charCoords(pos, "local").top-300}, {
        //           step: function( now, fx ) {
        //           window.editor.scrollTo(0,fx.now);
        //         },duration: 1000});
        //       }

        //     }
           

        //     window.editor.focus();


        //   }
        // }


        if (!skipSelect) {
          selectAndScroll(scriptCursorIndex, scrollToTop);
        }
        $(".module.selectable img").filter('.selected').removeClass('selected');
        var imageLoc = boardForCursor();
        if (imageLoc) {
          var image = scriptChunks[imageLoc.chunk].images[imageLoc.image];
          storyboardState.loadFlatBoard(image[0].file, false, chunkText(chunk));
          $("#script-image-" + image[0].file).addClass('selected');
        }
        else {
          sketchpane.noImage(chunkText(chunk));
        }

        if (imageLoc && imageLoc.image > 0 && chunkHasImages(imageLoc.chunk)) {
          var image = scriptChunks[imageLoc.chunk].images[imageLoc.image - 1];
          storyboardState.loadLightboxImage(image[0].file);
        } else {
          storyboardState.clearLightboxImage();
        }
      }
      $("#nano-script").nanoScroller({ flash: true });

      emitter.emit('selection:change', scriptCursorIndex, scriptImageCursorIndex);
    }
    else {
      scriptCursorIndex = 0;
      scriptImageCursorIndex = 0;
      goNext(1);
    }
  };

  var selectChunk = function(chunkIndex, scrollToTop, click) {
    selectChunkAndBoard(chunkIndex, 0, false, scrollToTop, click);
  };

  var updateSelection = function() {
    selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex);
  }

  var imageClickHandler = function(e) {
    e.preventDefault();
    e.stopPropagation(); // prevents separate chunk selection
    var id = this.id.split("-")[2];
    var index = atomToChunk[parseInt($(this).parent().attr('id').split("-")[2])].chunkIndex;
    //storyboardState.loadFlatBoard(id,false,scriptChunks[scriptCursorIndex].text);
    scriptCursorIndex = index;
    var chunk = scriptChunks[scriptCursorIndex];
    for (var i=0; i<chunk.images.length; i++) {
      if (chunk.images[i][0].file == id) {
        console.log("IMAGE CLICKED: " + id);
       scriptImageCursorIndex = i;
       break; 
      }
    }

    if (player.getFullState().state == 'playing') {
      selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex);
      var atom = getAtomForCursor();
      var update = timeline.getUpdateForAtom(atom);
      player.setPlayhead(update.time);
    }
    else if (recorder.getState() == 'paused') {
      selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex);
    }

    // scroll to board position in script editor.
    var find = window.editor.getSearchCursor(fountainManager.getAtomForCursor().file);
    if (find.find()) {
      var pos = find.pos.from;
      if (find.find()) {
      } else {
        if ($("#scripttext").css('display') == 'none') {
          window.editor.setCursor({line: pos.line, ch:0}, 0, {scroll: true});
          window.editor.scrollIntoView(pos, 300);
        } else {
          window.editor.setCursor({line: pos.line, ch:0});
          window.editor.scrollIntoView(pos);
          $("#scripttext").animate({z: window.editor.charCoords(pos, "local").top-300}, {
            step: function( now, fx ) {
            window.editor.scrollTo(0,fx.now);
          },duration: 200});
        }
      }
      window.editor.focus();
    }

  };

  var insertBoardAt = function(chunkIndex, boardIndex) {
    var file = new Date().getTime().toString();

    var newBoard = {
      time: 0,
      duration: 1000,
      durationIsCalculated: true,
      type: "image",
      file: file,
      tempIndex: file,
      id: file,
      scriptIndex: null  // will be set below
    };

    var chunk = scriptChunks[chunkIndex];
    if (!chunk) return;
    var scriptIndex = null;
    if (chunkHasImages(chunkIndex)) {
      var image = chunk.images[boardIndex];
      if (!image) {
        boardIndex = chunk.images.length - 1;
        image = chunk.images[boardIndex];
      }
      scriptIndex = getPositionAtTempIndex(image[1]) + 1;
      boardIndex += 1;
    } 
    else {
      chunk.images = [];
      scriptIndex = getPositionAtTempIndex(chunk.tempIndex) + 1;
      boardIndex = 0;
    }

    // add the atom
    script.splice(scriptIndex, 0, newBoard);

    // add to the list of images
    imageList.push([newBoard, scriptIndex]);
    _.each(imageList, function(image) {
      image[1] = image[0].scriptIndex;
    });
    imageList.sort(function(a, b) {
      return a[1] - b[1];
    });

    // update scriptIndex
    _.each(script, function(atom, index) {
      atom.scriptIndex = index;
    });

    // update image to board index mapping
    _.each(chunk.images, function(image, index) {
      atomToChunk[image[0].id] = chunk;
      atomToBoard[image[0].id] = index;
    });

    // add to the chunk
    chunk.images.splice(boardIndex, 0, [newBoard, file])

    // render the chunk
    renderScriptModule(chunkIndex);
    storyboardState.loadFlatBoard(file, true);
    if (boardIndex > 0) {
      storyboardState.loadLightboxImage(chunk.images[boardIndex - 1][0].file);
    } else {
      storyboardState.clearLightboxImage();
    }

    return {chunkIndex: chunkIndex, boardIndex: boardIndex};
  };


  var removeBoardAt = function(chunkIndex, boardIndex) {
    var chunk = scriptChunks[chunkIndex];
    if (!chunkHasImages(chunkIndex)) return {chunkIndex: chunkIndex, boardIndex: 0};

    var scriptIndex = getPositionAtTempIndex(chunk.images[boardIndex][1]);
    script.splice(scriptIndex, 1);

    // update scriptIndex
    _.each(script, function(atom, index) {
      atom.scriptIndex = index;
    });

    chunk.images.splice(boardIndex, 1);
    boardIndex = Math.max(boardIndex - 1, 0);

    // update image to board index mapping
    _.each(chunk.images, function(image, index) {
      atomToBoard[image[0].id] = index;
    });

    renderScriptModule(chunkIndex);
    if (chunkHasImages(chunkIndex)) {
      storyboardState.loadFlatBoard(chunk.images[boardIndex][0].file);
    } else {
      sketchpane.noImage(chunkText(chunk));
    }
    if (boardIndex > 0) {
      storyboardState.loadLightboxImage(chunk.images[boardIndex-1][0].file);
    } else {
      storyboardState.clearLightboxImage();
    }

    return {chunkIndex: chunkIndex, boardIndex: boardIndex};
  };

  var newBoard = function() {
    var pos = insertBoardAt(scriptCursorIndex, scriptImageCursorIndex);
    if (!pos) return;
    selectChunkAndBoard(pos.chunkIndex, pos.boardIndex);
    timeline.buildUpdates();
    storyboardState.saveScript();
    var oldScriptText = scriptText;
    scriptText = exportScriptText();
    
    console.log(outline)
    emitter.emit('script:change', scriptText, oldScriptText);
    userTracking.event('New Board').send();
  }

  var deleteBoard = function() {
    if (confirm("Are you sure you want to delete? You can not undo!")) {
      var pos = removeBoardAt(scriptCursorIndex, scriptImageCursorIndex);
      selectChunkAndBoard(pos.chunkIndex, pos.boardIndex);
      timeline.buildUpdates();
      storyboardState.saveScript();
      var oldScriptText = scriptText;
      scriptText = exportScriptText();

      emitter.emit('script:change', scriptText, oldScriptText);
    }
  }

  var getPositionAtTempIndex = function(tempIndex) {
    for (var i=0; i<script.length; i++) {
      if (script[i].tempIndex == tempIndex) { return i; }
    }
  };

 // var getPositionAtTempIndex = function(tempIndex) {
 //    for (var i=0; i<fountainManager.getScript().length; i++) {
 //      if (fountainManager.getScript()[i].tempIndex == tempIndex) { return i; }
 //    }
 //  };

  var renderScriptModule = function(index) {
    var chunk = scriptChunks[index];
    var chunkHtml = renderChunk(chunk) || '';
    $("#module-script-" + chunk.id).replaceWith(chunkHtml);
  }

  Handlebars.registerHelper('boardThumb', function() {
    return new Handlebars.SafeString(
      storyboardState.checkUpdated(this[0].file + "-small.jpeg")
    );
  });

  Handlebars.registerHelper('boardId', function() {
    return new Handlebars.SafeString(
      this[0].file
    );
  });

  var renderChunk = function(chunk) {
    var outlineChunk = outline[parseInt(chunk.scene)-1];
    if (!outlineChunk) return null;

    var sceneColor = vSceneListColors[outlineChunk.slugline.split(" - ")[0]].color;
    sceneColor = hexToRgb(sceneColor);

    var headerStyleText = 'background: -webkit-linear-gradient(left, rgba(' + sceneColor.r + ',' + sceneColor.g + ',' + sceneColor.b + ', 0.5) 10px, rgba(' + sceneColor.r + ',' + sceneColor.g + ',' + sceneColor.b + ', 0.1) 10px);';
    var mainStyleText = 'background: -webkit-linear-gradient(left, rgba(' + sceneColor.r + ',' + sceneColor.g + ',' + sceneColor.b + ', 0.5) 10px, rgba(0,0,0,0) 10px);';

    var template = templates[chunk.type];
    if (template) {
      return template({
        chunk: chunk,
        headerStyleText: headerStyleText,
        mainStyleText: mainStyleText,
        outlineChunk: outlineChunk
      });
    }
    else {
      return null;
    }
  };

  var renderScript = function() {
    scriptChunks = [];

    var imageCollection = null;
    var shots = 0;

    var lastAtom;

    for (var i=0; i<script.length; i++) {
      var atom = script[i];
      if (atom.boneyard) continue;
      
      var addChunk = function(addImages) {
        atom.chunkIndex = scriptChunks.length;
        scriptChunks.push(atom);
        atomToChunk[atom.id] = atom;
        if (addImages && imageCollection) {
          //atom.images = imageCollection;
          if (lastAtom) {
            scriptChunks[lastAtom].images = imageCollection;

            _.each(imageCollection, function(image, index) {
              atomToChunk[image[0].id] = atom;
              atomToBoard[image[0].id] = index;
            });
            imageCollection = null;
          }  
        }
      };

      switch (atom.type) {
        case 'scene_heading':
          addChunk(false);
          break;

        case 'action':
          shots++;
          addChunk(true);
          lastAtom = scriptChunks.length-1;
          break;

        case 'parenthetical':
          shots++;
          addChunk(true);
          lastAtom = scriptChunks.length-1;
          break;

        case 'dialogue':      
          shots++;
          addChunk(true);
          lastAtom = scriptChunks.length-1;
          break;

        case 'image':
          if (!imageCollection) {
            imageCollection = [];
          }
          imageCollection.push([atom, atom.id]);
          imageList.push([atom, i]);
          break;
      }
    }

    console.log("SHOTS: " + shots);

    // render the sidebar
    var html = [];
    for (var i = 0; i < scriptChunks.length; i++) {
      var chunk = scriptChunks[i];
      var chunkHtml = renderChunk(chunk);
      if (chunkHtml) html.push(chunkHtml);
    }
    return html.join('');
  };


function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

  var paginator = function (tokens) {
    var currentPage = 0;
    var currentLine = 0;
    var currentCurs = 0;

    var reqLine = 0;
    var inDialogue = 0;

    for (var i=0; i<tokens.length; i++) {
      if (inDialogue == 0){ reqLine = 0 };
      switch (tokens[i].type) {
        case 'scene_heading': reqLine += 3; break;
        case 'action': reqLine += linesForText(tokens[i].text, 63)+1; break;
        case 'dialogue_begin': inDialogue = 1; break;
        case 'dual_dialogue_begin': inDialogue = 1; break;
        case 'character': reqLine += 1; break;
        case 'parenthetical': reqLine += 1; break;
        case 'dialogue': reqLine += linesForText(tokens[i].text, 35); break;
        case 'dialogue_end': reqLine += 1; inDialogue = 0; break;
        case 'dual_dialogue_end': reqLine += 1; inDialogue = 0; break;
        case 'centered': reqLine += 2; break;
        case 'transition': reqLine += 2; break; 
      }
      if (inDialogue == 0){
        if ((currentLine + reqLine) < 55) {
          currentLine = currentLine + reqLine;
        } else {
          currentPage = currentPage + 1;
          currentLine = reqLine;
          switch (tokens[i].type) {
            case 'scene_heading': currentLine = currentLine - 1; break;
            case 'action': currentLine = currentLine - 1; break;
            case 'centered': currentLine = currentLine - 1; break;
            case 'transition': currentLine = currentLine - 1; break;
            case 'dialogue_end': currentLine = currentLine - 1; break;
            case 'dual_dialogue_end': currentLine = currentLine - 1; break;
          }
        }
      }
      tokens[i].page = currentPage+1;
    }
    stats['totalPages'] = currentPage+1;
  }

  function linesForText(text, charWidth) {
    var splitText = text.split(" ");
    var line = 0;
    var currentCurs = 0; 
    for (var i=0; i<splitText.length; i++) {
      if (splitText[i].indexOf("/>") != -1) {
        line = line + 1;
        currentCurs = splitText[i].length - 1;
      } else if (splitText[i].indexOf("<br") != -1) {
        currentCurs = 0;
      } else {
        if ((currentCurs + splitText[i].length) < charWidth){
          currentCurs = currentCurs + splitText[i].length + 1;
        } else {
          line = line + 1;
          currentCurs = splitText[i].length + 1;
        }
      }
    }
    return line+1;
  }

  function wordCount(text) {
    return text.split(" ").length;
  }
  
  function durationOfWords(text, durationPerWord) {
    return text.split(" ").length*durationPerWord;
  }



  var createScript = function (tokens) {

    var currentTime = 0;
    var currentCharacter = '';
    var currentParenthetical = null;
    var sceneCounter = 0;
    var inDualDialogue = 0;
    var inDialogue = 0;
    var pendingDuration = null;
    var inBoneyard = false;
    var setSettings = false;

    script = [];

    for (var i=0; i<tokens.length; i++) {
      var token = tokens[i];
      var text = token.text || '';
      var addAtom = function(opts) {
        if (pendingDuration !== null && opts.type !== 'note') {
          opts.duration = pendingDuration;
          opts.durationIsCalculated = false;
          pendingDuration = null;
        }
        var atom = _.extend({
          time: currentTime,
          duration: 0,
          durationIsCalculated: true,
          type: token.type,
          text: text,
          scene: sceneCounter,
          page: token.page,
          id: i,
          tempIndex: i,
          scriptIndex: script.length,
          boneyard: inBoneyard
        }, opts);
        script.push(atom);
        currentTime += atom.duration;
        return atom;
      };

      switch (tokens[i].type) {

        case 'boneyard_begin':
          inBoneyard = true;
          break;

        case 'boneyard_end':
          inBoneyard = false;
          break;

        case 'title':
          title = fountainHelpers.htmlToMarkup(token.text);
          addAtom({duration: 2000});
          break;

        case 'credit':
        case 'author':
          author = fountainHelpers.htmlToMarkup(token.text);
        case 'source':
        case 'draft_date':
        case 'contact':
          addAtom({});
          break;

        case 'scene_heading':
          sceneCounter++;
          addAtom({});
          break;

        case 'action':
          duration = durationOfWords(text, 200)+500;
          addAtom({duration: duration});
          break;

        case 'dialogue_begin': 
          inDialogue = 1;
          if (inDualDialogue) { inDualDialogue++; };
          break;

        case 'dual_dialogue_begin': 
          inDialogue = 1; 
          inDualDialogue = 1;
          break;

        case 'character':
          currentCharacter = text;
          currentParenthetical = null;
          break;

        case 'dialogue':      
          duration = durationOfWords(text, 300)+1000;
          var atom = addAtom({duration: duration, character: currentCharacter});
          if (inDualDialogue == 3) atom.dual = 1;
          if (currentParenthetical) atom.parenthetical = currentParenthetical;
          break;

        case 'parenthetical':
          currentParenthetical = text;
          break;

        case 'dialogue_end': 
          inDialogue = 0; 
          break;

        case 'dual_dialogue_end': 
          inDialogue = 0; 
          inDualDialogue = 0;
          break;

        case 'centered': 
          addAtom({duration: 2000});
          break;

        case 'transition': 
          addAtom({});
          break;

        case 'section':
          addAtom({depth: token.depth});
          break;

        case 'synopsis':
          addAtom({});
          break;

        case 'note':
          var noteMetaData = parseNote(text);
          if (noteMetaData && noteMetaData.board) {
            var atom = addAtom({type: 'image', file: noteMetaData.board, duration: 1000});
            if (noteMetaData.caption) atom.caption = noteMetaData.caption;
            if (noteMetaData.continued) atom.continued = noteMetaData.continued;
            if (noteMetaData.duration) {
              atom.duration = Math.floor(parseFloat(noteMetaData.duration) * 1000);
              atom.durationIsCalculated = false;
            }
          }
          else if (noteMetaData && noteMetaData.duration) {
            pendingDuration = Math.floor(parseFloat(noteMetaData.duration) * 1000);
          }
          else if (noteMetaData && noteMetaData.aspectRatio) {
            setSettings = true;
            settings.aspectRatio = parseFloat(noteMetaData.aspectRatio);
            aspectRatio.setAspectRatio(settings.aspectRatio);
            addAtom({settings: true});
          }
          else if (noteMetaData && noteMetaData.dataPath) {
            var path = fountainHelpers.htmlToMarkup(noteMetaData.dataPath);
            currentFile.setDataPath(path, false, loadingChange, true);
          }
          else if (noteMetaData && noteMetaData['Storyboard Fountain']) {
            // ignore for now
          }
          else {
            addAtom({});
          }
          break;
      }
    }

    stats.totalTime = script[script.length-1].time + script[script.length-1].duration;

    if (!setSettings) {
      // default to cinescope
      aspectRatio.setAspectRatio(2.35);
    }

    return script;
  }


  var parseNote = function(string) {
    var metaData = {};
    var chunks = string.split(',');
    if (chunks.length == 1 && chunks[0].split(':').length == 1) { return false; };
    for (var i=0; i<chunks.length; i++) {
      var keyValue = chunks[i].split(":");
      if (keyValue.length == 1) { return false; };
      metaData[keyValue[0].trim()] = keyValue[1].trim();
    }
    return metaData;
  };



  var extractCharacters = function(script) {

  tokens = script;

  // UNIQUE CHARACTERS

  vCharacters = {};
  vCharacterList = [];
  vCharacterListCount = [];
  vMainChars = []

  for (var i=0; i<tokens.length; i++) {
    if (tokens[i].type == "dialogue") {
      if (vCharacters.hasOwnProperty(tokens[i].character.split(" (")[0])) {
        vCharacters[tokens[i].character.split(" (")[0]] += 1;
      } else {
        vCharacters[tokens[i].character.split(" (")[0]] = 1;
        vCharacterList.push(tokens[i].character.split(" (")[0]);
      }
    }
  }



  for ( var key in vCharacters) {
    vCharacterListCount.push([key, vCharacters[key]])
  }
  vCharacterListCount.sort(function(a,b){return b[1]-a[1]})

  if (vCharacterListCount.length > 0) {
    vMainChars.push(vCharacterListCount[0][0])
  }
  if (vCharacterListCount.length > 1) {
    vMainChars.push(vCharacterListCount[1][0])
  }

  console.log(vCharacterListCount);

  var options = $('#characters');
  options.empty();
  options.append($("<option />").val("").text("Everyone"));
  for (var i = 0; i < Math.min(vCharacterListCount.length,5); i++) {
    options.append($("<option />").val(vCharacterListCount[i][0]).text(vCharacterListCount[i][0]));
  }
  // $.each(result, function() {
  //     options.append($("<option />").val(this.ImageFolderID).text(this.Name));
  // });

}





  var createOutline = function(script) {

    // time
    // dialogue lines
    // scene number
    // who is in the scene
    // color

    // page
    // time



    var sceneCount = 0;
    var recentSection = "";
    var recentSectionId = null;
    var recentSynopsis = "";
    var recentSynopsisId = null;
    var dialogueCount = 0;
    var timeMarkIn = 0;



    var outline = [];

    for (var i=0; i<script.length; i++) {
      if (script[i].type == "section") {
        recentSection = script[i].text;
        recentSectionId = i;
      }
      if (script[i].type == "synopsis") {
        recentSynopsis = script[i].text;
        recentSynopsisId = i;
      }
      if (script[i].type == "dialogue") {
        dialogueCount++;
      }
      if (script[i].type == "scene_heading") {

        if (outline.length > 0){
          outline[outline.length-1].dialogue = dialogueCount;
          outline[outline.length-1].duration = script[i].time - timeMarkIn;
        } 
        dialogueCount = 0;
        timeMarkIn = script[i].time;

        sceneAtom = {
          'slugline': script[i].text, 
          'scriptIndex': i, 
          'title': recentSection, 
          'synopsis': recentSynopsis, 
          'dialogue': 0, 
          'duration': 0, 
          'page': script[i].page, 
          'time': script[i].time, 
          'titleId': recentSectionId, 
          'synopsisId': recentSynopsisId,
          'scene': sceneCount + 1
        };
        outline.push(sceneAtom);



        sceneCount++;
        timeMarkIn = script[i].time;

        recentSection = recentSynopsis = "";
      }
    }

    if (outline.length > 0) {
      outline[outline.length-1].dialogue = dialogueCount;
      outline[outline.length-1].duration = script[script.length-1].time - timeMarkIn;
    }

    return outline;
  }


  var vColors = ["6dcff6", "f69679", "00bff3", "f26c4f", "fff799", "c4df9b", "f49ac1", "8393ca", "82ca9c", "f5989d", "605ca8", "a3d39c", "fbaf5d", "fff568", "3cb878", "fdc689", "5674b9", "8781bd", "7da7d9", "a186be", "acd373", "7accc8", "1cbbb4", "f9ad81", "bd8cbf", "7cc576", "f68e56", "448ccb"];

  var vTimeGradients = {
    "morning": "linear-gradient(rgba(213,243,255,0.8), rgba(109,207,246,0.7), rgba(100,100,255,0.0))",
    "day": "linear-gradient(rgba(144,224,255,0.7), rgba(100,100,255,0.0))",
    "afternoon": "linear-gradient(rgba(113,113,208,0.7), rgba(222,186,44,0.7), rgba(100,100,255,0.0))",
    "night": "linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.7), rgba(44,69,222,0.4))"};


  var vSceneListColors;

  var getUniqueLocations = function(script) {
    // UNIQUE LOCATIONS

    vScenes = {};
    vSceneList = [];
    vSceneCount = 0;
    vSceneListColors = {}

    vUniqueCount = 0;

    for (var i=0; i<script.length; i++) {
      if (script[i].type == "scene_heading") {
        vSceneCount++;
        if (vScenes.hasOwnProperty(script[i].text.split(" - ")[0])) {
          vScenes[script[i].text.split(" - ")[0]] += 1;
        } else {
          vUniqueCount++;
          vScenes[script[i].text.split(" - ")[0]] = 1;
          vSceneList.push(script[i].text.split(" - ")[0]);
          vSceneListColors[script[i].text.split(" - ")[0]] = {color: vColors[vUniqueCount % vColors.length]}
        }
      }
    }

    /*console.log('getUniqueLocations', {
      colors: vSceneListColors,
      list: vSceneList,
      scenes: vScenes,
      "total scenes": vSceneCount,
      "unique locations": vSceneList.length
    });*/
  }

  var renderScenes = function(outline) {
    var length;
    length = $("#nano-script").height();
    var x = 0;
    var previousTime = 0;
    var previousColor = "000";
    var html = [];
    for (var i=0; i<outline.length; i++) {
      x++;
      pos = Math.floor(((outline[i].time-outline[0].time)/(outline[outline.length-1].time+outline[outline.length-1].duration-outline[0].time))*length);
      siz = Math.ceil((outline[i].duration/(outline[outline.length-1].time+outline[outline.length-1].duration-outline[0].time))*length);
      col = vSceneListColors[outline[i].slugline.split(" - ")[0]].color
      html.push("<div class='sidebar-scene-link' data-scene='" + (i+1) + "' title='Scene " + (i+1) + ":&#10;" + (outline[i].title || outline[i].slugline).replace("'","&#146;") + "' style='position: absolute; top: " + pos + "px; left: 0px; height: "+siz+"px; background-color: #" + col + "; width: 100%; box-shadow: -1px -1px 0px rgba(0,0,0,0.2) inset, 0px 1px 0px rgba(255,255,255,0.3) inset;'></div>")
    }
    return html.join('');
  }

  var renderOutline = function(outline) {
    //console.log('renderOutline', outline);

    html = [];

    for (var i=0; i<outline.length; i++) {

      color = "#" + vSceneListColors[outline[i].slugline.split(" - ")[0]].color;
      // switch (outline[i].slugline.split(" - ")[1]) {
      //     case 'EARLY EVENING':
      //     case 'DUSK':
      //     case 'AFTERNOON':
      //     case 'PRE-DAWN':
      //     case 'LATE AFTERNOON':
      //     case 'DAWN':
      //       shade = vTimeGradients["afternoon"];
      //       break;
      //     case 'EVENING':
      //     case 'NIGHT': 
      //     case 'LATE AT NIGHT':
      //       shade = vTimeGradients["night"];
      //       break;
      //     case 'MORNING':
      //       shade = vTimeGradients["morning"];
      //       break;
      //     case 'DAY':
      //     case 'DAYTIME':
      //       shade = vTimeGradients["day"];
      //       break;
      //   } 
 
      if (outline[i].slugline.split(".")[0] == "INT") {
        style = "border-left: 3px solid " + "#999" + ";";
        slugclass = "int"
      } else {
        style = "border-left: 3px dotted " + "#999" + ";";
        slugclass = "ext"
      }

       // 



      html.push('<div class="scene-card ' + slugclass + '" style="background: ' + color + '"><div class="abs"><div class="scene-card-shade" style="'+style+'"></div></div><div style="position: relative;"><div class="number">' + (i+1) + ' - </div><div class="slug">' + outline[i].slugline + ' </div><div class="title">' + outline[i].title + '&nbsp;</div><div class="synopsis">' + outline[i].synopsis + ' </div><div class="duration">' + renderTimeString(outline[i].duration) + '</div><div class="dialogue-count">lines: ' + outline[i].dialogue + '</div><div class="page">pg. ' + outline[i].page + '</div></div></div>')
    }
    return html.join('');
  }

  var pad = function(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  var renderTimeString = function (time, includeMS) {
    h = Math.floor(time/(60000*60));
    m = Math.floor(time/60000)-(h*60);
    s = Math.floor(time/1000)-(h*3600)-(m*60);
    ms = Math.floor(time/100)-(h*36000)-(m*600)-(s*10);
  
    if (h != 0){
      timeString = pad(h,1) + ":" + pad(m,2) + ":" + pad(s,2);
    } else {
      timeString = pad(m,2) + ":" + pad(s,2);
    }

    if (includeMS) {
      timeString = timeString + ":" + pad(ms,1);
    }
    return timeString;
  };

  var getScript = function() {
    return script;
  };

  var capitaliseFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
 
  var exportScriptText = function() {
    var scriptText = [];
    var currentCharacter = "";

    var titlePage = true;
    var inBoneyard = false;
    var inTitlePage = true;  // different than titlePage
    var hasSettings = false;

    for (var i=0; i<script.length; i++) {
      var atom = script[i];
      var checkBoneyardBegin = function() {
        if (atom.boneyard && !inBoneyard) {
          inBoneyard = true;
          scriptText.push('/*');
        }
      };
      var checkBoneyardEnd = function() {
        if (!atom.boneyard && inBoneyard) {
          inBoneyard = false;
          scriptText.push('*/');
        }
      };
      var checkDuration = function() {
        if (atom.type == 'image') return;
        if (!atom.durationIsCalculated) {
          if (titlePage) {
            titlePage = false;
            scriptText.push('');
          }
          scriptText.push('[[duration: ' + (atom.duration / 1000).toFixed(2) + ']]');
          scriptText.push('');
        }
      };
      var insertSettings = function() {
        settings.aspectRatio = aspectRatio.getAspectRatio();
        var text = _.map(settings, function(value, key) {
          return key + ": " + value;
        }).join(', ');
        scriptText.push('');
        scriptText.push('[[Storyboard Fountain: ' + gui.App.manifest.version + ']]');
        scriptText.push('');
        scriptText.push('[[' + text + ']]');
        scriptText.push('');
        scriptText.push('[[' + 'dataPath: ' + currentFile.getDataPath() + ']]');
      }
      var checkSettings = function() {
        switch (atom.type) {
          case 'title':
          case 'credit':
          case 'author':
          case 'source':
          case 'draft_date':
          case 'contact':
            inTitlePage = true;
            break;

          default:
            inTitlePage = false;
            break;
        }
        if (atom.settings) {
          hasSettings = true;
        }
        if (!inTitlePage && !hasSettings) {
          insertSettings();
          hasSettings = true;
        }
      };

      checkBoneyardBegin();
      checkDuration();
      checkSettings();

      switch (script[i].type) {
        case 'title':
        case 'credit':
        case 'author':
        case 'source':
        case 'draft_date':
        case 'contact':
          //var tempVal = script[i].text.replace(/(<br \/>)+/g, "\n").trim();

          var text = script[i].text || '';
          var lines = fountainHelpers.htmlToMarkup(text.replace(/(<br \/>)+/g, "\n").trim()).split("\n");

          if (lines.length > 1) {
            scriptText.push(capitaliseFirstLetter(script[i].type).replace("_", " ") + ":");
            for (var i2=0; i2<lines.length; i2++) {
              scriptText.push("    " + lines[i2].trim());
            }
          } else {
            scriptText.push(capitaliseFirstLetter(script[i].type).replace("_", " ") + ": " + lines[0].trim());
          }
         
          break;
        case 'scene_heading':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          if (script[i].text.indexOf("EXT") == -1 && script[i].text.indexOf("INT") == -1 && script[i].text.indexOf("EST") == -1 && script[i].text.indexOf("I/E") == -1) {
            scriptText.push("." + fountainHelpers.htmlToMarkup(script[i].text));
          } else {
            scriptText.push(fountainHelpers.htmlToMarkup(script[i].text));
          }          
          scriptText.push('');
          break;
        case 'action':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          scriptText.push(fountainHelpers.htmlToMarkup(script[i].text.replace(/(<br \/>)+/g, "\n").trim()));
          scriptText.push('');
          break;
        case 'parenthetical':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          if (currentCharacter !== script[i].character) {
            currentCharacter = script[i].character;
            if (script[i].dual) {
              scriptText.push(script[i].character + " ^");
            } else {
              scriptText.push(script[i].character);
            }
          }
          scriptText.push(script[i].text.replace(/(<br \/>)+/g, "\n").trim());
          if (script.length > i+1 && (script[i+1].character === undefined || currentCharacter !== script[i+1].character)) {
            currentCharacter = "";
            scriptText.push('');
          }  
          break;
        case 'dialogue':      
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          if (currentCharacter !== script[i].character) {
            currentCharacter = script[i].character;
            if (script[i].dual) {
              scriptText.push(script[i].character + " ^");
            } else {
              scriptText.push(script[i].character);
            }
          }
          if (script[i].parenthetical) {
            scriptText.push(script[i].parenthetical);
          }
          scriptText.push(fountainHelpers.htmlToMarkup(script[i].text.replace(/(<br \/>)+/g, "\n").trim()));
          if (script.length > i+1 && (script[i+1] && (script[i+1].character === undefined || currentCharacter !== script[i+1].character))) {
            currentCharacter = "";
            scriptText.push('');
          }          
          break;
        case 'centered': 
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          var lines = fountainHelpers.htmlToMarkup(script[i].text.replace(/(<br \/>)+/g, "\n").trim()).split("\n");
          for (var i2=0; i2<lines.length; i2++) {
            scriptText.push("> " + lines[i2].trim() + " <");
          }
          scriptText.push('');
          break;
        case 'transition': 
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          if (script[i].text.indexOf("TO:") == -1) {
            scriptText.push("> " + script[i].text);
          } else {
            scriptText.push(script[i].text);
          }
          scriptText.push('');
          break;
        case 'section':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          switch (script[i].depth) {
            case 1:
              scriptText.push('# ' + script[i].text);
              break;
            case 2: 
              scriptText.push('## ' + script[i].text);
              break;
            case 3: 
              scriptText.push('### ' + script[i].text);
              break;
            case 4: 
              scriptText.push('#### ' + script[i].text);
              break;
            case 5: 
              scriptText.push('##### ' + script[i].text);
              break;
 

          }
          scriptText.push('');
          break;
        case 'synopsis':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          scriptText.push('= ' + script[i].text);
          scriptText.push('');
          break;
        case 'note':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          if (script[i].settings) {
            insertSettings();
          }
          else {
            scriptText.push('[[' + script[i].text + ']]');
          }
          scriptText.push('');
          break;
        case 'image':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          var duration = '';
          if (!atom.durationIsCalculated) {
            duration = ', duration: ' + (atom.duration / 1000).toFixed(2);
          }
          var continued = '';
          if (atom.continued) {
            continued = ', continued: true';
          }

          scriptText.push('[[board: ' + script[i].file + duration + continued + ']]');
          scriptText.push('');
          break;

      }

      checkBoneyardEnd();



    }
    return scriptText.join("\n").trim();  

  };

  var preloadAround = function() {
    var index;
    for (var i=0;i<imageList.length;i++) {
      if (imageList[i][0].file == storyboardState.getCurrentBoard()) {
        index = i;
        break;
      }
    }    

    for (var i=-1;i<3;i++) {
      if (i !== 0) {
        var ind = index + i;
        ind = Math.max(Math.min(imageList.length - 1, ind), 0);
        var image = new Image();
        var source = storyboardState.checkUpdated(imageList[ind][0].file + "-large.jpeg");
        image.src = source;
      }
    }
  }

  var indexInBounds = function(index) {
    return index >= 0 && index < scriptChunks.length;
  }

  var canSelectChunk = function(index) {
    return (
      indexInBounds(index) && 
      scriptChunks[index].type != 'scene_heading'
    );
  };

  /**
   * direction must be 1 or -1
   * will return the index of the next selectable chunk in the 
   * specified direction or null
   */
  var findNextSelectableChunk = function(direction) {
    var i = 1;
    while (true) {
      if (!indexInBounds(scriptCursorIndex + i * direction)) {
        // base case: reached the beginning/end, no selection
        return null;
      }
      if (canSelectChunk(scriptCursorIndex + i * direction)) {
        // base case: found a chunk we can select
        return scriptCursorIndex + i * direction;
      }
      // iterative case: try prev/next chunk
      i += 1;
    }
  }

  var chunkHasImages = function(index) {
    return scriptChunks[index] &&
      scriptChunks[index].images && 
      scriptChunks[index].images.length > 0;
  }

  var nextScene = function(increment) {
    var nextIndex = Math.min(Math.max(scriptChunks[scriptCursorIndex].scene+increment,1),outline.length);
    console.log(nextIndex)
    selectSceneAndScroll(nextIndex);
  }

  // increment should be positive or negative to indicate direction
  var goNext = function(increment) {
    if (increment > 0) {
      if (chunkHasImages(scriptCursorIndex) && 
        scriptImageCursorIndex < scriptChunks[scriptCursorIndex].images.length-1
      ) {
        // move to the next image in this chunk
        scriptImageCursorIndex++;
        updateSelection();
      }
      else {
        // move to the next selectable chunk
        var index = findNextSelectableChunk(1);
        if (index != null) {
          selectChunk(index);
        }
      }        
    }
    else {
      if (chunkHasImages(scriptCursorIndex) &&
        scriptImageCursorIndex > 0
      ) {
        // move to the previous image in this chunk
        scriptImageCursorIndex--;
        updateSelection();
      } 
      else {
        // move to the previous selectable chunk
        var index = findNextSelectableChunk(-1);
        if (index != null) {
          scriptCursorIndex = index;
          // choose the last image, or 0/none
          if (chunkHasImages(scriptCursorIndex)) {
            scriptImageCursorIndex = scriptChunks[scriptCursorIndex].images.length - 1;
          }
          else {
            scriptImageCursorIndex = 0;
          }
          updateSelection();
        }
      }
    }
  };

  var selectAndScroll = function(index, scrollToTop) {
    $(".module.selectable").filter('.selected').removeClass('selected');
    var chunk = scriptChunks[index];

    var $chunk = $("#module-script-" + chunk.id);

    if ($chunk.offset()) {
      $chunk.addClass('selected');
      $("#script").finish();
      if (scrollToTop) {
        var chunk2 = scriptChunks[index-1];
        var difference = 0;
        if (chunk2) {
          var $chunk2 = $("#module-script-" + chunk2.id);
          if ($chunk2 && $chunk2.offset()) {
            difference = $chunk2.offset().top - 105;
          }
        }
        $("#script").animate({scrollTop: $("#script").scrollTop() + difference}, 100);
      } else {
        if (($chunk.offset().top+$chunk.outerHeight())> $("#script").height()) {
          var difference = ($chunk.offset().top+$chunk.outerHeight()) - $("#script").height();
          $("#script").animate({scrollTop: $("#script").scrollTop() + difference}, 100);
        }
        if (($chunk.offset().top) < (0 + 100)) {
          var difference = $chunk.offset().top - 100;
          $("#script").animate({scrollTop: $("#script").scrollTop() + difference}, 100);
        }
      }
    }
  };

  var selectSceneAndScroll = function(scene, click) {
    // var atom = script[outline[scene].scriptIndex];
    // var pos = getCursorForAtom(atom.id);

    // if (click) {
    //   console.log("clicked!");
    // }

    var sceneNumber = 0;
    var currentChunk = 0;

    console.log("SCENE: "  + scene);


    for (var i = 0; i < scriptChunks.length; i++) { 
      if (scriptChunks[i].type == "scene_heading") {
        sceneNumber++;
        if (scene == sceneNumber) {
          currentChunk = i;
          break;
        }
      }
    }

    console.log(currentChunk+1);



    selectChunk(currentChunk+1, true);
  }

  var getScriptChunks = function(){ return scriptChunks;};
  var getScriptChunk = function(index) { return scriptChunks[index]; }

  var boardForCursor = function() {
    var chunk = scriptCursorIndex;
    var fail = false;

    while (true) {
      if (scriptChunks[chunk].type == 'scene_heading') {
        fail = true;
        break;
      }
      else if (chunkHasImages(chunk)) {
        if (scriptImageCursorIndex !== null && typeof(scriptImageCursorIndex) != 'undefined') {
          // fail if there is no image there
          fail = !scriptChunks[chunk].images[scriptImageCursorIndex];
        }
        break;
      }
      else if (chunk > 0) {
        chunk -= 1;
      }
      else {
        fail = true;
        break;
      }
    }

    if (fail) {
      return null;
    }
    else if (chunk == scriptCursorIndex) {
      return {chunk: chunk, image: scriptImageCursorIndex || 0};
    }
    else {
      return {chunk: chunk, image: scriptChunks[chunk].images.length - 1};
    }
  };

  var atoms = function(index, callback) {
    while (index < script.length && callback(script[index], index)) {
      index++;
    }
    index++;
    return {atomIndex: index, done: index >= script.length};
  };

  // return the atom that corresponds to the cursor position (chunk, board)
  var getAtomForCursor = function(chunkIndex, boardIndex) {
    if (arguments.length == 0) {
      chunkIndex = scriptCursorIndex;
      boardIndex = scriptImageCursorIndex;
    }
    var chunk = scriptChunks[chunkIndex];
    if (!chunk) return null;
    if (chunkHasImages(chunkIndex)) {
      if (chunk.images[boardIndex || 0]) {
        return script[chunk.images[boardIndex || 0][0].scriptIndex];
      }
      else {
        return null;
      }
    }
    else {
      return script[chunk.scriptIndex];
    }
  };

  var getCursorForAtom = function(atomId) {
    return {
      chunkIndex: atomToChunk[atomId] && atomToChunk[atomId].chunkIndex, 
      boardIndex: atomToBoard[atomId]
    };
  };

  var setAtomDuration = function(atom, ms) {
    atom.duration = ms;
    atom.durationIsCalculated = false;
    timeline.buildUpdates();
  }

  var updateScriptChanges = function() {
    storyboardState.saveScript();
    var oldScriptText = scriptText;
    scriptText = exportScriptText();
    emitter.emit('script:change', scriptText, oldScriptText);
  }


  var generateBoardStats = function() {
    var objects = scriptChunks;
    var imagesCount = 0;
    var sceneArray = [];
    var sceneStats = [];
    var scenesWithImagesCount = 0;
    var elementsWithImagesCount = 0;
    var elementsCount = 0;
    var currentScene = 0;
    for (var i=0; i<objects.length; i++) {
      if (typeof sceneStats[objects[i].scene-1] == 'undefined') { sceneStats[objects[i].scene-1] = {}; } 
      if (currentScene != objects[i].scene) {
        sceneStats[objects[i].scene-1]["elementsCount"] = 0;
        currentScene = objects[i].scene;
      }
      switch (objects[i].type) {
        case 'action':
        case 'dialogue':
        case 'parenthetical':
          
          elementsCount++;
          sceneStats[objects[i].scene-1]["elementsCount"] = ++sceneStats[objects[i].scene-1]["elementsCount"] || 1;  
          if (objects[i].images && objects[i].images.length > 0) {
            sceneArray[objects[i].scene-1] = 1;
            elementsWithImagesCount++;
            sceneStats[objects[i].scene-1]["elementsWithImagesCount"] = ++sceneStats[objects[i].scene-1]["elementsWithImagesCount"] || 1;
            imagesCount = imagesCount + objects[i].images.length;
            sceneStats[objects[i].scene-1]["imagesCount"] = sceneStats[objects[i].scene-1]["imagesCount"] + objects[i].images.length || 1;
          }
          break;
      }
    }

    for(var i in sceneArray) { scenesWithImagesCount += sceneArray[i]; }

    var boardsLeft = (elementsCount - elementsWithImagesCount)*Math.max((imagesCount / (elementsWithImagesCount || 1 )),1.5) || 0;


    //console.log(sceneStats);

    console.log("Total boards: " + imagesCount);
    console.log("Estimated boards left: " + boardsLeft);
    console.log("%: " + imagesCount / boardsLeft);
    console.log("---------");
    console.log("Estimated hours left (30 seconds/board): " + ((boardsLeft*0.5)/60));
    console.log("---------");
    console.log("Script elements with boards: " + elementsWithImagesCount);
    console.log("Total script elements: " + elementsCount);
    console.log("%: " + elementsWithImagesCount / elementsCount);
    console.log("---------");
    console.log("Scenes with boards: " + scenesWithImagesCount);
    console.log("Total scenes: " + vSceneCount);
    console.log("%: " + scenesWithImagesCount / vSceneCount);
    console.log("---------");
    console.log("Average board per element: " + imagesCount / elementsWithImagesCount);
    console.log("---------");
 
    html = [];

    html.push( percentageBlock(imagesCount / (imagesCount + Math.round(boardsLeft)), 100) + '<div>Total boards: ' + imagesCount + ' / ' + (imagesCount + Math.round(boardsLeft)) + ' (estimated) ' + '</div>');
    html.push('<div>Estimated hours left to boards: ' + Math.round(((boardsLeft*0.5)/60)*100)/100 + ' hours</div>');
    html.push('<hr/>');
    html.push( percentageBlock(elementsWithImagesCount / elementsCount, 100) + '<div>Script elements with boards: ' + elementsWithImagesCount + ' / ' + elementsCount + '</div>');
    html.push('<div>Average board per element: ' + ((imagesCount / elementsWithImagesCount) || 0).toFixed(1) + '</div>');
    html.push('<hr/>');
    html.push( percentageBlock(scenesWithImagesCount / vSceneCount, 100) + '<div>Scenes with boards: ' + scenesWithImagesCount + ' / ' + vSceneCount + '</div>');
    html.push('<hr/>');

    for (var i=0; i<sceneStats.length; i++) {
      html.push('<div class="stats-scene-complete" data-scene="' + i + '">');
      html.push('<div>' + (i+1) + ': ' + (outline[i].title || outline[i].slugline) + '</div>');
      //console.log(sceneStats[i])
      if (Object.keys(sceneStats[i]).length > 1) {
        html.push(percentageBlock(sceneStats[i]["elementsWithImagesCount"] / sceneStats[i]["elementsCount"], 100));
      } else {
        html.push(percentageBlock(0, 100));
      }
      html.push('</div>');
    }

    return html.join('');
  };

  var percentageBlock = function(percent, width) {

    var html = '<div><span style="width:' + (percent*width) + 'px; height: 10px; display: inline-block; background-color: rgb(100,100,100); border-radius: 2px 2px 2px 2px;"></span>' + '<span style="width:' + ((1-percent)*width) + 'px; height: 10px; display: inline-block; background-color: rgb(200,200,200); border-radius: 0 2px 2px 0;"></span> ' + Math.round(percent * 100) + '%</div>';

    return html;
  };

  var getTitle = function() {
    return title;
  };

  var getAuthor = function() {
    return author;
  };

  var getCursor = function() {
    return {
      chunkIndex: scriptCursorIndex,
      boardIndex: scriptImageCursorIndex
    };
  };

  var fountainManager = window.fountainManager = {
    load: load,
    loadChange: loadChange,
    getTitle: getTitle,
    getAuthor: getAuthor,
    getScript: getScript,
    getScriptChunks: getScriptChunks,
    getScriptChunk: getScriptChunk,
    getCursor: getCursor,
    getOutlineItem: function(index) { return outline[index]; },
    getAtom: function(index) { return script[index]; },
    getAtoms: function() { return script; },
    getCursorHasImages: function() { return chunkHasImages(scriptCursorIndex); },
    exportScriptText: exportScriptText,
    goNext: goNext,
    newBoard: newBoard,
    preloadAround: preloadAround,
    deleteBoard: deleteBoard,
    getScript: function() { return scriptText; },
    emitter: emitter,
    atoms: atoms,
    getAtomForCursor: getAtomForCursor,
    getCursorForAtom: getCursorForAtom,
    selectChunkAndBoard: selectChunkAndBoard,
    renderScenes: function() { 
      if (typeof(outline) != "undefined") { 
        $("#scene-colorbars").html(renderScenes(outline)); 
    
        $('.sidebar-scene-link').click(function() {
          selectSceneAndScroll(parseInt($(this).attr('data-scene')),true);
        });



      }
    },
    setAtomDuration: setAtomDuration,
    updateScriptChanges: updateScriptChanges,
    generateBoardStats: generateBoardStats,
    selectSceneAndScroll: selectSceneAndScroll,
    nextScene: nextScene
  };

}).call(this);
