/* TODO:
  
  hook in all ui stuff

*/

;(function() {
  'use strict';

  //var AUTO_UPLOAD_LAYER_TIME = 2;
  //var AUTO_UPLOAD_FLAT_TIME = 6;
  //var URL_STRING = "https://s3-us-west-2.amazonaws.com/storyboard.setpixel.com/";

  var scriptData = [];
  var updatedImgData = {};

  var currentBoard;
  var updatedImgList;
  
  var timeoutLayerID;
  var timeoutFlatID;

  var dirty = [0,0];
  var dirtyLayer = [0,0,0,0,0,0,0,0,0,0,0,0];

    if (localStorage.getItem("updatedImgList")) {
      updatedImgList = JSON.parse(localStorage.getItem("updatedImgList"));
    } else {
      updatedImgList = {};
    }

  /*
  var loadURL = function (url) {

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", url, false);
    xmlhttp.send();
    parseScript(xmlhttp.responseText);
    fillBoardsList();
    loadFlatBoard(currentBoard);
  };

  var parseScript = function(script) {
    scriptData = script.split(",");
    currentBoard = scriptData[0];
  };
  */

  var checkUpdated = function(filename) {
    if (updatedImgList[filename]) {

      if (updatedImgData[filename]) {
        return updatedImgData[filename];
      } else {
        //var value = URL_STRING + filename + "?" + updatedImgList[filename];
        var value = currentFile.imageUrl(filename + "?" + updatedImgList[filename]);
        return value;
      }
    } else {
      //return URL_STRING + filename;
      return currentFile.imageUrl(filename);
    }
  };

  var addUpdatedImage = function(filename) {
    updatedImgList[filename] = new Date().getTime().toString();
    localStorage.setItem("updatedImgList", JSON.stringify(updatedImgList)); 
  };

  var addUpdatedImageData = function(filename, data) {
    updatedImgData[filename] = data;
  }

  var fillBoardsList = function() {
    var html = [];
    for (var i = 0; i < scriptData.length; i ++) {
      html.push("<div id='" + scriptData[i] + "'><img src='" + checkUpdated(scriptData[i] + "-small.jpeg") + "'> " + scriptData[i] + "</div>");
    }
    $($('.boards-list')[0]).html(html.join(''));

    $(".boards-list div").click( function(e){
      var id = this.id;
      loadFlatBoard(id);
    });
    
    $(".boards-list div").mouseenter( function(){
      var id = this.id;
      preload(id);
    });
  };

  $(document).ready(function() {
    $(".drawing-canvas").mousemove(function(){
      if (sketchpane.getEditMode()) {
      }
      else {
        preLoadLayers();
      }
    });
  });

  var preLoadLayers = function(copyAfter) {
    var layerURLs = [];
    for (var i = 0; i < 3; i ++) {
      layerURLs.push(checkUpdated(currentBoard + '-layer-' + i + '.png'));
    }
    sketchpane.loadLayers(layerURLs, currentBoard, copyAfter);
  }

  var addBoardToList = function(boardname) {
    var html = "<div id='" + boardname + "'><img> " + boardname + "</div>";
    $($('.boards-list')[0]).append(html);
    $("#" + boardname).click( function(e){
      var id = this.id;
      loadFlatBoard(id);
    });
    $("#" + boardname).mouseenter( function(){
      var id = this.id;
      preload(id);
    });
  };

  var newBoard = function() {
    var boardName = new Date().getTime().toString();
    scriptData.push(boardName);
    saveScript(function(err) {
      addBoardToList(boardName);
      loadFlatBoard(boardName, true);
    });
  };

  var saveScript = function(next) {
    currentFile.saveScript(next);
    /*
    $.ajax({
      type: "POST", 
      url:"http://localhost:3000/save-script", 
      data: {
        filename: 'test.fountain', 
        content: fountainManager.exportScriptText()
      }}).done(function(o){log("yes")});
    */
  };

  var setLayerDirty = function(layer) {
    dirty = [1,1];
    dirtyLayer[layer] = 1;
    if (timeoutLayerID) {
    } else {
      timeoutLayerID = window.setTimeout(
        uploadLayer, 
        currentFile.settings().AUTO_UPLOAD_LAYER_TIME * 1000);
    }
    if (timeoutFlatID) {
    } else {
      timeoutFlatID = window.setTimeout(
        uploadFlat, 
        currentFile.settings().AUTO_UPLOAD_FLAT_TIME * 1000);
    }
  };

  var saveImage = function(filename, imageData, type) {
    // save is a promise
    var save = currentFile.saveImage(filename, imageData, 'image/jpeg');
    save.done(function() {
      addUpdatedImage(filename);
    });
    addUpdatedImageData(filename, imageData);
    return save;
  };

  var uploadLayer = function() {
    timeoutLayerID = null;
    for (var i = 0; i < dirtyLayer.length; i ++) {
      if (dirtyLayer[i]) {
        var filename = currentBoard + "-layer-" + i + ".png";
        var imageData = sketchpane.getLayerImage(i);
        saveImage(filename, imageData, 'image/png');
        /*
        var ajaxReq = {
          type: "POST", 
          url: "http://localhost:3000/save-img", 
          data: {
            imgBase64: sketchpane.getLayerImage(i),
            filename: currentBoard + "-layer-" + i + ".png",
            contentType: 'image/png'
          }};
        addUpdatedImageData(ajaxReq.data.filename, ajaxReq.data.imgBase64);
        $.ajax(ajaxReq).done(function(filename){
          addUpdatedImage(filename);
        }(ajaxReq.data.filename));
        $.ajax(ajaxReq).fail(function(o){alert("problem solving. this is a big deal.")});
        */
        dirtyLayer[i] = 0;
      }
    }
    dirty[0] = 0;
  };

  var uploadFlat = function() {
    timeoutFlatID = null;
    dirty[1] = 0;
    var flatImages = sketchpane.getFlatImage();

    var filename = currentBoard + "-large.jpeg";
    var imageData = flatImages[0];
    saveImage(filename, imageData, 'image/jpeg');
    
    setThumb(flatImages[1]);

    filename = currentBoard + "-small.jpeg";
    imageData = flatImages[1];
    saveImage(filename, imageData, 'image/jpeg');

    /*
    var ajaxReq = {
      type: "POST", 
      url: "http://localhost:3000/save-img", 
      data: {
        imgBase64: flatImages[0],
        filename: currentBoard + "-large.jpeg",
        contentType: 'image/jpeg'
      }};
    setThumb(flatImages[1]);
    addUpdatedImageData(ajaxReq.data.filename, flatImages[0]);
    $.ajax(ajaxReq).done(function(filename){
      addUpdatedImage(filename);
    }(ajaxReq.data.filename)).fail(function(o){alert("problem solving. this is a big deal.")});
    ajaxReq = {
      type: "POST", 
      url: "http://localhost:3000/save-img", 
      data: {
        imgBase64: flatImages[1],
        filename: currentBoard + "-small.jpeg",
        contentType: 'image/jpeg'
      }};
    addUpdatedImageData(ajaxReq.data.filename, flatImages[1]);
    $.ajax(ajaxReq).done(function(filename){
      addUpdatedImage(filename);
    }(ajaxReq.data.filename)).fail(function(o){alert("problem solving. this is a big deal.")});
    */
  };

  var getDirty = function getDirty() {
    if (dirty[0] || dirty[1]) {
      return true;
    } else {
      return false;
    }
  };

  var forceSave = function() {
    window.clearTimeout(timeoutLayerID);
    window.clearTimeout(timeoutFlatID);
    timeoutLayerID = null;
    timeoutFlatID = null;
    if (dirty[0]) {
      uploadLayer();
    } 
    if (dirty[1]) {
      uploadFlat();
    } 
  };

  var goNext = function(increment) {
    var index = scriptData.indexOf(currentBoard);
    index = index + increment;
    index = Math.max(Math.min(scriptData.length - 1, index), 0);
    var id = scriptData[index];
    loadFlatBoard(id);
  };

  var preloadAround = function() {
    var index = scriptData.indexOf(currentBoard);
    for (var i=-1;i<3;i++) {
      if (i !== 0) {
        var ind = index + i;
        ind = Math.max(Math.min(scriptData.length - 1, ind), 0);
        var image = new Image();
        var source = checkUpdated(scriptData[ind] + "-large.jpeg");
        image.src = source;
      }
    }
  };

  var preload = function(id) {
    var image = new Image();
    var source = checkUpdated(id + "-large.jpeg");
    image.src = source;
  };

  var loadFlatBoard = function(id, newboard, caption) {
    forceSave();
    currentBoard = id;
    var index = scriptData.indexOf(currentBoard);

    if (caption) {
      $('.drawing-canvas .caption').html(caption);
      $('.drawing-canvas .caption').show();
    }

    if (newboard) {
      sketchpane.newSketch();
    } else {
      sketchpane.loadFlatImage(checkUpdated(id + "-large.jpeg"));
    }
    $(".boards-list img.selected").removeClass( "selected" );
    $("#" + id).addClass( "selected" );
    fountainManager.preloadAround();
    $('.boards-list').finish();
    // this sometimes/always competes with selectandscroll in fountainmanager
    $('.boards-list').animate({scrollTop: ($('.boards-list div').outerHeight()*(index-2)+100)}, 100);
  };

  var loadLightboxImage = function(id) {
    var url = checkUpdated(id + "-large.jpeg");
    $("#lightbox-image").attr("src", url);
    if (sketchpane.getLighboxMode()) {
      $("#lightbox-image").css("display", "block");
    } else {
      $("#lightbox-image").css("display", "none");
    }
  };

  var clearLightboxImage = function() {
    $("#lightbox-image").attr("src", "");
    $("#lightbox-image").css("display", "none");
  };

  var setThumb = function(img) {
    log("setting thumbnail:" + currentBoard)
    $("#script-image-" + currentBoard).attr('src', img);
  };

  var getScriptData = function() { return scriptData; };

  var getCurrentBoard = function() {
    return currentBoard;
  };

  var storyboardState = window.storyboardState = {
    //loadURL: loadURL,
    newBoard: newBoard,
    setLayerDirty: setLayerDirty,
    getDirty: getDirty,
    forceSave: forceSave,
    goNext: goNext,
    setThumb: setThumb,
    getScriptData: getScriptData,
    getCurrentBoard: getCurrentBoard,
    checkUpdated: checkUpdated,
    loadFlatBoard: loadFlatBoard,
    saveScript: saveScript,
    preLoadLayers: preLoadLayers,
    loadLightboxImage: loadLightboxImage,
    clearLightboxImage: clearLightboxImage
  };

}).call(this);