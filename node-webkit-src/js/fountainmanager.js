;(function() {
  
  var stats = {};
  var script = [];
  var scriptChunks = [];
  var imageList = [];

  var scriptCursorIndex = 1;
  var scriptImageCursorIndex = 0;

  var load = function(config) {
    parseFountain(config.script);
  }

  var parseFountain = function (fountainText) {
    var tokens = "";
    fountain.parse(fountainText, true, function (output) {
      tokens = output.tokens;
    });

    paginator(tokens);
    script = createScript(tokens);
    
    getUniqueLocations(script);

    outline = createOutline(script);
    
    characters = extractCharacters(script);

    $("#script").html(renderScript());

    $(".module.selectable img").click(imageClickHandler);

    $(".module.selectable").click(function(e){
      e.stopPropagation();
      var newIndex = parseInt($(this).attr('id').split("-")[2]);
      selectChunk(newIndex);
    });

    // load initial selection
    scriptCursorIndex = parseInt(localStorage.getItem('scriptCursorIndex') || 0);
    scriptImageCursorIndex = parseInt(localStorage.getItem('scriptImageCursorIndex') || 0);
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
      if (chunk.images && chunk.images.length > 0) {
        var image = chunk.images[scriptImageCursorIndex];
        if (image) {
          storyboardState.loadFlatBoard(image[0].file, false, chunk.text);
        }
        else {
          console.log('should not be here');
          sketchpane.noImage(chunk.text);
        }
      }
      else {
        sketchpane.noImage(chunk.text);
      }

      if (scriptImageCursorIndex > 0 && chunk.images && chunk.images.length > scriptImageCursorIndex) {
        var image = chunk.images[scriptImageCursorIndex-1];
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
    var id = this.id;
    storyboardState.loadFlatBoard(id.split("-")[2],false,scriptChunks[scriptCursorIndex].text);
    scriptCursorIndex = parseInt($(this).parent().attr('id').split("-")[2]);
    var chunk = scriptChunks[scriptCursorIndex];
    for (var i=0; i<chunk.images.length; i++) {
      if (chunk.images[i][0].file == id.split("-")[2]) {
       scriptImageCursorIndex = i;
       break; 
      }
    }

    selectChunkAndBoard(scriptCursorIndex, scriptImageCursorIndex);
  };

  var insertBoardAt = function(loc) {
    var file = new Date().getTime().toString();

    var newBoard = {
      time: 0,
      duration: 0,
      type: "image",
      file: file,
      tempIndex: file
    };

    if (scriptChunks[scriptCursorIndex].images) {
      var scriptIndex = getPositionAtTempIndex(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex][1]);
      script.splice(scriptIndex+1, 0, newBoard);

      imageList.push([newBoard, scriptIndex]);
      imageList.sort(function(a, b) {
        return a[1] - b[1];
      });

      scriptChunks[scriptCursorIndex].images.splice(scriptImageCursorIndex+1, 0, [newBoard, file])
      scriptImageCursorIndex = scriptImageCursorIndex + 1;
    } else {
      var scriptIndex = getPositionAtTempIndex(scriptChunks[scriptCursorIndex].tempIndex);
      script.splice(scriptIndex, 0, newBoard);

      imageList.push([newBoard, scriptIndex]);
      imageList.sort(function(a, b) {
        return a[1] - b[1];
      });

      scriptChunks[scriptCursorIndex].images = [];
      scriptImageCursorIndex = scriptChunks[scriptCursorIndex].images.push([newBoard, file]) - 1

    }



    //scriptImageCursorIndex
    // check at index if there are images at 0 if 0
    // if so find the script index and add
    // if not set the index of cursor index and add.




    renderScriptModule(scriptCursorIndex);
    storyboardState.loadFlatBoard(file, true);

    if (scriptImageCursorIndex > 0) {
      storyboardState.loadLightboxImage(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex-1][0].file);
    } else {
      storyboardState.clearLightboxImage();
    }

  };


  var removeBoardAt = function(loc) {
    if (scriptChunks[scriptCursorIndex].images) {
      var scriptIndex = getPositionAtTempIndex(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex][1]);
      script.splice(scriptIndex, 1);

      // imageList.push([newBoard, scriptIndex]);
      // imageList.sort(function(a, b) {
      //   return a[1] - b[1];
      // });

      scriptChunks[scriptCursorIndex].images.splice(scriptImageCursorIndex, 1)
      scriptImageCursorIndex = Math.max(scriptImageCursorIndex - 1,0);
    }

    renderScriptModule(scriptCursorIndex);

    if (scriptChunks[scriptCursorIndex].images.length > 0) {
      log(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex][0])
      storyboardState.loadFlatBoard(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex][0].file);
    } else {
      sketchpane.noImage(scriptChunks[scriptCursorIndex].text);
    }


    //storyboardState.loadFlatBoard(file, true);

    if (scriptImageCursorIndex > 0) {
      storyboardState.loadLightboxImage(scriptChunks[scriptCursorIndex].images[scriptImageCursorIndex-1][0].file);
    } else {
      storyboardState.clearLightboxImage();
    }

  };

  var newBoard = function() {
    insertBoardAt(scriptCursorIndex)
    selectAndScroll(scriptCursorIndex);
    storyboardState.saveScript();
    log("current cursor: " + scriptCursorIndex);
    log("current image:  " + scriptImageCursorIndex);
   }

  var deleteBoard = function() {
    var r = confirm("Are you sure you want to delete? You can not undo!");
    if (r == true) {
      removeBoardAt(scriptCursorIndex)
      selectAndScroll(scriptCursorIndex);
      storyboardState.saveScript();
      log("current cursor: " + scriptCursorIndex);
      log("current image:  " + scriptImageCursorIndex);
    } else {
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

    $("#module-script-" + index).html(html.join(''));
    //$("#module-script-" + index + " img").click(imageClickHandler);
  }


  var renderScript = function() {
    log(script);
    var objects = [];

    var imageCollection = null;

    var shots = 0;

    for (var i=0; i<script.length; i++) {
      switch (script[i].type) {
        case 'scene_heading':
          var object = objects.push(script[i]);
          objects[object-1]['scriptIndex'] = i;
          break;
        case 'action':
          shots++;
          var object = objects.push(script[i]);
            objects[object-1]['scriptIndex'] = i;
          if (imageCollection) {
            log("IMAGES")
            objects[object-1]['images'] = imageCollection;
            imageCollection = null;
          }
          break;
        case 'parenthetical':
          shots++;
          var object = objects.push(script[i]);
            objects[object-1]['scriptIndex'] = i;
          if (imageCollection) {
            log("IMAGES")
            objects[object-1]['images'] = imageCollection;
            imageCollection = null;
          }
          break;
        case 'dialogue':      
          shots++;
          var object = objects.push(script[i]);
            objects[object-1]['scriptIndex'] = i;
          if (imageCollection) {
            log("IMAGES")
            objects[object-1]['images'] = imageCollection;
            imageCollection = null;
          }
          break;
        case 'image':
          if (imageCollection) {

          } else {
            imageCollection = [];
          }
          imageCollection.push([script[i],script[i].tempIndex])
          imageList.push([script[i],i]);
          // scriptText.push('[[' + script[i].text + ']]');
          // scriptText.push('');
          break;

      }
    }

    scriptChunks = objects;

    log("SHOTS: " + shots)

    log(objects);
    var html = [];

    for (var i=0; i<objects.length; i++) {
      switch (objects[i].type) {
        case 'scene_heading':
          html.push('<div class="module" id="module-script-' + i + '">' + objects[i].text + '</div>')
          break;
        case 'action':
          html.push('<div class="module selectable" id="module-script-' + i + '">')
          if (objects[i].images) {
            for (var i2=0; i2<objects[i].images.length; i2++) {
              log(objects[i].images[i2])
              html.push("<img id='script-image-" + objects[i].images[i2][0].file + "' src='" + storyboardState.checkUpdated(objects[i].images[i2][0].file + "-small.jpeg") + "'>");
            }
          }
          html.push('<div>' + objects[i].text + '</div></div>')
          break;
        case 'parenthetical':
        case 'dialogue':      
          html.push('<div class="module selectable" id="module-script-' + i + '">')
          if (objects[i].images) {
            for (var i2=0; i2<objects[i].images.length; i2++) {
              log(objects[i].images[i2])
              html.push("<img id='script-image-" + objects[i].images[i2][0].file + "' src='" + storyboardState.checkUpdated(objects[i].images[i2][0].file + "-small.jpeg") + "'>");
            }
          }
          html.push('<div>' + objects[i].character + '<br/>' + objects[i].text + '</div></div>')
          break;
      }
    }

    log(imageList)
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

  //vPageCount = currentPage+1;

  //console.log("page count: " + vPageCount);
 
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
    var vScript = []
    var vCurrentTime = 0;
    var vCurrentCharacter = "";

    var sceneCounter = 0;

    var inDualDialogue = 0;

    for (var i=0; i<tokens.length; i++) {
      log(tokens[i])

      switch (tokens[i].type) {
        case 'title':
          var atom = {
            time: vCurrentTime,
            duration: 2000,
            type: 'title',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += 2000;
          vScript.push(atom);
          break;
        case 'credit':
        case 'author':
        case 'source':
        case 'draft_date':
        case 'contact':
          var atom = {
            time: vCurrentTime,
            duration: 0,
            type: tokens[i].type,
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += 0;
          vScript.push(atom);
          break;
        case 'scene_heading':
          sceneCounter++;
          // duration = 2000;
          //  var atom = {
          //   time: vCurrentTime,
          //   duration: duration,
          //   type: 'scene_padding',
          //   scene: sceneCounter,
          //   page: tokens[i].page,
          // }
          // vCurrentTime += duration;
          // vScript.push(atom);


          duration = 0;
          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'scene_heading',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += duration;
          vScript.push(atom);
          break;
        case 'action':
          duration = durationOfWords(tokens[i].text, 200)+500;

          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'action',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += duration;
          vScript.push(atom);
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
          vCurrentCharacter = tokens[i].text;
          break;
        case 'parenthetical':
          duration = durationOfWords(tokens[i].text, 300)+1000;

          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'parenthetical',
            text: tokens[i].text,
            character: vCurrentCharacter,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          if (inDualDialogue == 3) { atom["dual"] = 1; }
          vCurrentTime += duration;
          vScript.push(atom);
          break;
        case 'dialogue':      
          duration = durationOfWords(tokens[i].text, 300)+1000;
          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'dialogue',
            text: tokens[i].text,
            character: vCurrentCharacter,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          if (inDualDialogue == 3) { atom["dual"] = 1; }
          vCurrentTime += duration;
          vScript.push(atom);
          break;

        case 'dialogue_end': 
          inDialogue = 0; 
          break;
        case 'dual_dialogue_end': 
          inDialogue = 0; 
          inDualDialogue = 0;
          break;
        case 'centered': 
          duration = 2000;
          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'centered',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += duration;
          vScript.push(atom);
          break;
        case 'transition': 
          duration = 0;
          var atom = {
            time: vCurrentTime,
            duration: duration,
            type: 'transition',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += duration;
          vScript.push(atom);
          break;
        case 'section':
          var atom = {
            time: vCurrentTime,
            duration: 0,
            depth: tokens[i].depth,
            type: 'section',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += 0;
          vScript.push(atom);
          break;
        case 'synopsis':
          var atom = {
            time: vCurrentTime,
            duration: 0,
            type: 'synopsis',
            text: tokens[i].text,
            scene: sceneCounter,
            page: tokens[i].page,
            tempIndex: i
          }
          vCurrentTime += 0;
          vScript.push(atom);
          break;
        case 'note':

          var noteMetaData = parseNote(tokens[i].text);

          if (noteMetaData) {
            var atom = {
              time: vCurrentTime,
              duration: 0,
              type: 'image',
              file: noteMetaData.file,
              time: noteMetaData.time,
              text: tokens[i].text,
              scene: sceneCounter,
              page: tokens[i].page,
              tempIndex: i
            };
            if (noteMetaData.caption) { atom['caption'] = noteMetaData.caption; };
          } else {
             var atom = {
              time: vCurrentTime,
              duration: 0,
              type: 'note',
              text: tokens[i].text,
              scene: sceneCounter,
              page: tokens[i].page,
              tempIndex: i
           }
          }
          vCurrentTime += 0;
          vScript.push(atom);
          break;

      }

      
      //console.log(tokens[i]);

    }

    script = vScript;
  
    stats['totalTime'] = vScript[vScript.length-1].time + vScript[vScript.length-1].duration;

    return vScript;
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

  log(script)

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

  //console.log("total scenes: " + vSceneCount);
  log(vCharacterListCount);
  //console.log("pages per scene: " + (vPageCount / vSceneCount));


  var options = $('#characters');
  options.empty();
options.append($("<option />").val("").text("Everyone"));
  for (var i = 0; i < Math.min(vCharacterListCount.length,5); i++) {
    log(vCharacterListCount[i][0])
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

        //console.log(script[i].text + " - " + recentSection);

        recentSection = recentSynopsis = "";
      }
    }

    outline[outline.length-1].dialogue = dialogueCount;
    outline[outline.length-1].duration = script[script.length-1].time - timeMarkIn;


    //console.log(outline);
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

    log(vSceneListColors);
    log(vSceneList);
    log(vScenes);


    log("total scenes: " + vSceneCount);
    log("unique locations: " + vSceneList.length);
    //console.log("pages per scene: " + (vPageCount / vSceneCount));


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
    log(outline);

    html = [];

    log(vSceneListColors);






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

  log(recursiveMarkdown("asdfdfa kdfhjak sdfjhakjdhf <span class='underline'>adfasdf<span class='bold'>adsfadsf</span>adfadsfadF</span>"));

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
      i += 1 * direction;
    }
  }

  var chunkHasImages = function(index) {
    return scriptChunks[index].images && 
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
    var $chunk = $("#module-script-" + index);
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

  var fountainManager = window.fountainManager = {
    load: load,
    //loadURL: loadURL,
    getScript: getScript,
    getScriptChunks: getScriptChunks,
    exportScriptText: exportScriptText,
    goNext: goNext,
    newBoard: newBoard,
    preloadAround: preloadAround,
    deleteBoard: deleteBoard
  };

}).call(this);