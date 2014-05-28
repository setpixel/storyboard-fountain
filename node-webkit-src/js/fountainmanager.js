;(function() {
  
  var events = require('events');
  var _ = require('underscore');

  var emitter = new events.EventEmitter();

  var scriptText = '';

  var stats = {};
  var script = [];
  var scriptChunks = [];
  var imageList = [];

  var scriptCursorIndex = 1;
  var scriptImageCursorIndex = 0;

  var atomToChunk = {};
  var atomToBoard = {};

  var load = function(config) {
    var oldScriptText = scriptText;
    scriptText = config.script;
    emitter.emit('script:change', scriptText, oldScriptText);
    parseFountain(config.script);
  }

  var loadChange = function(text) {
    var oldScriptText = scriptText;
    scriptText = text;
    emitter.emit('script:change', scriptText, oldScriptText, true);
    parseFountain(text);
    storyboardState.saveScript();
  }

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

    $("#script").html(renderScript());

    $(".module.selectable img").click(imageClickHandler);

    $(".module.selectable").click(function(e){
      e.stopPropagation();
      var id = parseInt($(this).attr('id').split("-")[2]);
      selectChunk(atomToChunk[id].chunkIndex);
    });

    // load initial selection
    scriptCursorIndex = parseInt(localStorage.getItem('scriptCursorIndex') || 0) || 0;
    scriptImageCursorIndex = parseInt(localStorage.getItem('scriptImageCursorIndex') || 0) || 0;
    selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex, true);
  };

  // TODO: skipSelect is needed b/c we can't select the chunk on initial load without causing an error
  var selectChunkAndBoard = function(chunkIndex, boardIndex, skipSelect) {
    scriptCursorIndex = chunkIndex;
    scriptImageCursorIndex = boardIndex;
    localStorage.setItem('scriptCursorIndex', scriptCursorIndex);
    localStorage.setItem('scriptImageCursorIndex', scriptImageCursorIndex);
    var chunk = scriptChunks[scriptCursorIndex];
    if (chunk) {
      if (!skipSelect) {
        selectAndScroll(scriptCursorIndex);
      }
      $(".module.selectable img").filter('.selected').removeClass('selected');
      var imageLoc = boardForCursor();
      if (imageLoc) {
        var image = scriptChunks[imageLoc.chunk].images[imageLoc.image];
        storyboardState.loadFlatBoard(image[0].file, false, chunk.text);
        $("#script-image-" + image[0].file).addClass('selected');
      }
      else {
        sketchpane.noImage(chunk.text);
      }

      if (imageLoc && imageLoc.image > 0 && chunkHasImages(imageLoc.chunk)) {
        var image = scriptChunks[imageLoc.chunk].images[imageLoc.image - 1];
        storyboardState.loadLightboxImage(image[0].file);
      } else {
        storyboardState.clearLightboxImage();
      }
    }
  };

  var selectChunk = function(chunkIndex) {
    selectChunkAndBoard(chunkIndex, 0);
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
       scriptImageCursorIndex = i;
       break; 
      }
    }

    selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex);
  };

  var insertBoardAt = function(chunkIndex, boardIndex) {
    var file = new Date().getTime().toString();

    var newBoard = {
      time: 0,
      duration: 0,
      type: "image",
      file: file,
      tempIndex: file,
      id: file,
      scriptIndex: null  // will be set below
    };

    var chunk = scriptChunks[chunkIndex];
    var scriptIndex = null;
    if (chunkHasImages(chunkIndex)) {
      scriptIndex = getPositionAtTempIndex(chunk.images[boardIndex][1]) + 1;
      boardIndex += 1;
    } 
    else {
      chunk.images = [];
      scriptIndex = getPositionAtTempIndex(chunk.tempIndex);
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
      sketchpane.noImage(chunk.text);
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
    selectChunkAndBoard(pos.chunkIndex, pos.boardIndex);
    timeline.buildUpdates();
    storyboardState.saveScript();
    var oldScriptText = scriptText;
    scriptText = exportScriptText();
    emitter.emit('script:change', scriptText, oldScriptText);
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

    var html = [];

    switch (scriptChunks[index].type) {
      case 'action':
        if (scriptChunks[index].images.length > 0) {
          for (var i2=0; i2<scriptChunks[index].images.length; i2++) {
            html.push("<img id='script-image-" + scriptChunks[index].images[i2][0].file + "' src='" + storyboardState.checkUpdated(scriptChunks[index].images[i2][0].file + "-small.jpeg") + "'>");
          }
        }
        html.push('<div>' + scriptChunks[index].text + '</div>')
        break;
      case 'parenthetical':
        if (scriptChunks[index].images.length > 0) {
          for (var i2=0; i2<scriptChunks[index].images.length; i2++) {
            html.push("<img id='script-image-" + scriptChunks[index].images[i2][0].file + "' src='" + storyboardState.checkUpdated(scriptChunks[index].images[i2][0].file + "-small.jpeg") + "'>");
          }
        }
        html.push('<div>' + scriptChunks[index].character + '<br/>' + scriptChunks[index].text + '</div>')
        break;
      case 'dialogue':      
        if (scriptChunks[index].images.length > 0) {
          for (var i2=0; i2<scriptChunks[index].images.length; i2++) {
            html.push("<img id='script-image-" + scriptChunks[index].images[i2][0].file + "' src='" + storyboardState.checkUpdated(scriptChunks[index].images[i2][0].file + "-small.jpeg") + "'>");
          }
        }
        html.push('<div>' + scriptChunks[index].character + '<br/>' + scriptChunks[index].text + '</div>')
        break;
    }



    //return html.join('');  
    $("#module-script-" + chunk.id).html(html.join(''));
    $("#module-script-" + chunk.id + " img").click(imageClickHandler);
  }

  var renderScript = function() {
    scriptChunks = [];

    var imageCollection = null;
    var shots = 0;

    for (var i=0; i<script.length; i++) {
      var atom = script[i];
      var addChunk = function(addImages) {
        atom.chunkIndex = scriptChunks.length;
        scriptChunks.push(atom);
        atomToChunk[atom.id] = atom;
        if (addImages && imageCollection) {
          atom.images = imageCollection;
          _.each(imageCollection, function(image, index) {
            atomToChunk[image[0].id] = atom;
            atomToBoard[image[0].id] = index;
          });
          imageCollection = null;
        }
      };

      switch (atom.type) {
        case 'scene_heading':
          addChunk(false);
          break;

        case 'action':
          shots++;
          addChunk(true);
          break;

        case 'parenthetical':
          shots++;
          addChunk(true);
          break;

        case 'dialogue':      
          shots++;
          addChunk(true);
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

    var objects = scriptChunks;

    console.log("SHOTS: " + shots);
    console.log(objects);
    var html = [];

    for (var i=0; i<objects.length; i++) {
      var chunk = objects[i];

      switch (chunk.type) {
        case 'scene_heading':
          html.push('<div class="module" id="module-script-' + chunk.id + '">' + chunk.text + '</div>')
          break;

        case 'action':
          html.push('<div class="module selectable" id="module-script-' + chunk.id + '">')
          if (chunk.images) {
            for (var i2=0; i2<chunk.images.length; i2++) {
              html.push("<img id='script-image-" + chunk.images[i2][0].file + "' src='" + storyboardState.checkUpdated(chunk.images[i2][0].file + "-small.jpeg") + "'>");
            }
          }
          html.push('<div>' + chunk.text + '</div></div>')
          break;

        case 'parenthetical':
        case 'dialogue':      
          html.push('<div class="module selectable" id="module-script-' + chunk.id + '">')
          if (chunk.images) {
            for (var i2=0; i2<chunk.images.length; i2++) {
              html.push("<img id='script-image-" + chunk.images[i2][0].file + "' src='" + storyboardState.checkUpdated(chunk.images[i2][0].file + "-small.jpeg") + "'>");
            }
          }
          html.push('<div>' + chunk.character + '<br/>' + chunk.text + '</div></div>')
          break;
      }
    }

    return html.join('');  
  };


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
    var sceneCounter = 0;
    var inDualDialogue = 0;
    var inDialogue = 0;

    script = [];

    for (var i=0; i<tokens.length; i++) {
      var token = tokens[i];
      var addAtom = function(opts) {
        var atom = _.extend({
          time: currentTime,
          duration: 0,
          type: token.type,
          text: token.text,
          scene: sceneCounter,
          page: token.page,
          id: i,
          tempIndex: i,
          scriptIndex: script.length
        }, opts);
        script.push(atom);
        currentTime += atom.duration;
        return atom;
      };

      switch (tokens[i].type) {

        case 'title':
          addAtom({duration: 2000});
          break;

        case 'credit':
        case 'author':
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
          duration = durationOfWords(tokens[i].text, 200)+500;
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
          currentCharacter = token.text;
          break;

        case 'parenthetical':
        case 'dialogue':      
          duration = durationOfWords(tokens[i].text, 300)+1000;
          var atom = addAtom({duration: duration, character: currentCharacter});
          if (inDualDialogue == 3) atom.dual = 1;
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
          var noteMetaData = parseNote(token.text);
          if (noteMetaData && 
              parseInt(noteMetaData.file) + '' == noteMetaData.file && 
              parseInt(noteMetaData.time) + '' == noteMetaData.time
          ) {
            var atom = addAtom({type: 'image', file: noteMetaData.file, time: noteMetaData.time, duration: 1000});
            if (noteMetaData.caption) atom.caption = noteMetaData.caption;
          }
          else {
            addAtom({});
          }
          break;
      }
    }

    stats.totalTime = script[script.length-1].time + script[script.length-1].duration;

    return script;
  }


  var parseNote = function(string) {
    var metaData = {};
    var chunks = string.split(',');
    if (chunks.length == 1) { return false; };
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
    var recentSynopsis = "";
    var dialogueCount = 0;
    var timeMarkIn = 0;



    var outline = [];

    for (var i=0; i<script.length; i++) {
      if (script[i].type == "section") {
        recentSection = script[i].text;
      }
      if (script[i].type == "synopsis") {
        recentSynopsis = script[i].text;
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

        sceneAtom = {'slugline': script[i].text, 'title': recentSection, 'synopsis': recentSynopsis, 'dialogue': 0, 'duration': 0, 'page': script[i].page, 'time': script[i].time };
        outline.push(sceneAtom);



        sceneCount++;
        timeMarkIn = script[i].time;

        recentSection = recentSynopsis = "";
      }
    }

    outline[outline.length-1].dialogue = dialogueCount;
    outline[outline.length-1].duration = script[script.length-1].time - timeMarkIn;

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

    console.log('getUniqueLocations', {
      colors: vSceneListColors,
      list: vSceneList,
      scenes: vScenes,
      "total scenes": vSceneCount,
      "unique locations": vSceneList.length
    });
  }

  var renderScenes = function(outline, vertical) {
    var length;
    if (vertical == true) {
      length = $( window ).height();
    } else {
      length = $( window ).width();
    }

    var x = 0;

    var previousTime = 0;
    var previousColor = "000";

    var html = [];

    for (var i=0; i<outline.length; i++) {
      x++;
      if (vertical == true) {
        pos = Math.floor((outline[i].time/this.fountain.visualize.stats['totalTime'])*length);
        siz = Math.ceil((outline[i].duration/this.fountain.visualize.stats['totalTime'])*length);
        col = vSceneListColors[outline[i].slugline.split(" - ")[0]].color

        html.push("<div style='position: absolute; top: " + pos + "px; left: 0px; height: "+siz+"px; background-color: #" + col + "; width: 20px;'></div>")
          
      }
    }

    return html.join('');
  }


  var renderOutline = function(outline) {
    console.log('renderOutline', outline);

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

  var recursiveMarkdown = function(string) {
    for (var i=0; i<10; i++) {
      string = convert2markdown(string);
    }
    return string;
  }

  var convert2markdown = function(string) {
    var finalString = "";
    var j = $.parseHTML(string)
    for (var i=0; i<j.length; i++) {
      switch ($(j[i]).attr('class')) {
        case 'underline':
          finalString = finalString + "_" + $(j[i]).html() + "_";
          break;
        case 'italic':
          finalString = finalString + "*" + $(j[i]).html() + "*";
          break;
        case 'bold':
          finalString = finalString + "**" + $(j[i]).html() + "**";
          break;
        default:
          finalString = finalString + $(j[i]).text();
      }  
    }
    return finalString;
  }

  var exportScriptText = function() {
    scriptText = [];
    var currentCharacter = "";

    var titlePage = true;

    for (var i=0; i<script.length; i++) {
      switch (script[i].type) {
        case 'title':
        case 'credit':
        case 'author':
        case 'source':
        case 'draft_date':
        case 'contact':
          //var tempVal = script[i].text.replace(/(<br \/>)+/g, "\n").trim();

          var lines = recursiveMarkdown(script[i].text.replace(/(<br \/>)+/g, "\n").trim()).split("\n");

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
            scriptText.push("." + recursiveMarkdown(script[i].text));
          } else {
            scriptText.push(recursiveMarkdown(script[i].text));
          }          
          scriptText.push('');
          break;
        case 'action':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          scriptText.push(recursiveMarkdown(script[i].text.replace(/(<br \/>)+/g, "\n").trim()));
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
          if (script[i+1].character === undefined || currentCharacter !== script[i+1].character) {
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
          scriptText.push(recursiveMarkdown(script[i].text.replace(/(<br \/>)+/g, "\n").trim()));
          if (script[i+1] && (script[i+1].character === undefined || currentCharacter !== script[i+1].character)) {
            currentCharacter = "";
            scriptText.push('');
          }          
          break;
        case 'centered': 
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          var lines = recursiveMarkdown(script[i].text.replace(/(<br \/>)+/g, "\n").trim()).split("\n");
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
          scriptText.push('[[' + script[i].text + ']]');
          scriptText.push('');
          break;
        case 'image':
          if (titlePage) { 
            titlePage = false;
            scriptText.push('');
          }
          scriptText.push('[[type: image, file: ' + script[i].file + ', time: ' + script[i].time + ']]');
          scriptText.push('');
          break;

      }




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

  var selectAndScroll = function(index) {
    $(".module.selectable").filter('.selected').removeClass('selected');
    var chunk = scriptChunks[index];
    var $chunk = $("#module-script-" + chunk.id);
    $chunk.addClass('selected');
    $("#script").finish();
    if (($chunk.offset().top+$chunk.outerHeight())> $("#script").height()) {
      var difference = ($chunk.offset().top+$chunk.outerHeight()) - $("#script").height();
      $("#script").animate({scrollTop: $("#script").scrollTop() + difference}, 100);
    }
    if (($chunk.offset().top) < (0 + 100)) {
      var difference = $chunk.offset().top - 100;
      $("#script").animate({scrollTop: $("#script").scrollTop() + difference}, 100);
    }
  };

  var getScriptChunks = function(){ return scriptChunks;};

  var boardForCursor = function() {
    var chunk = scriptCursorIndex;
    var fail = false;

    while (true) {
      if (scriptChunks[chunk].type == 'scene_heading') {
        fail = true;
        break;
      }
      else if (chunkHasImages(chunk)) {
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
    if (chunkHasImages(chunkIndex)) {
      return script[chunk.images[boardIndex || 0][0].scriptIndex];
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

  var fountainManager = window.fountainManager = {
    load: load,
    loadChange: loadChange,
    getScript: getScript,
    getScriptChunks: getScriptChunks,
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
    selectChunkAndBoard: selectChunkAndBoard
  };

}).call(this);