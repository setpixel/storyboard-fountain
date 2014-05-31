/* TODO:

  lamp

  use request animation frame to draw the active layer

  make mouse alternative

*/

;(function() {
  'use strict';

  var events = require('events');

  var emitter = new events.EventEmitter();

  var TO_RADIANS = Math.PI/180; 
  var TO_DEGREES = 1 / TO_RADIANS;

  var layerNames = ["layer-1-ink", "layer-1-pencil", "layer-1-pen"];
  var drawCanvasNames = ["layer-1-active", "layer-1-active-visible"];

  var currentLayer = 1;
  var currentColor = [[241,239,255], [206,201,255], [0,0,0]];
  var brushProperties = {size: window.devicePixelRatio, opacity: 0};
  var contexts = [];
  var copyLayers = [];

  var drawContexts = [];

  var brushImgs = [];
  var brushCount = 256;

  var editMode = false;
  var locked;

  var penAttributes = [];
  var previousPenAttributes = [];
  var fakePressure = 0.5;

  var undoStack = [];

  var undoPosition = 0;

  var MAXUNDOS = 100;

  var canvasSize = [680 * aspectRatio.getAspectRatio(), 680];

  var penOffset = [];
  var previousLoc = []
  var penDown = false;
  var mult;

  var noCanvas = false;
  var lightboxMode = false;

  var requestAnimationFrameID;

  var pointerBuffer = [];

  function _updateAspectRatio(ratio) {
    canvasSize = [Math.floor(680 * aspectRatio.getAspectRatio()), 680];
    $('#drawpane .canvas').attr('width', canvasSize[0]).attr('height', canvasSize[1]);
  };
  aspectRatio.emitter.on('aspectRatio:change', _updateAspectRatio);
  $(document).ready(_updateAspectRatio);

  var usingWacom = function() {
    var wacom = getWacomPlugin();
    return wacom && wacom.penAPI && (wacom.penAPI.pointerType == 1 || wacom.penAPI.pointerType == 3);
  }

  $(document).ready(function() {
    for (var i=0;i<layerNames.length;i++) {
      contexts.push(document.getElementById(layerNames[i]).getContext('2d'));
    }
    for (var i=0;i<drawCanvasNames.length;i++) {
      drawContexts.push(document.getElementById(drawCanvasNames[i]).getContext('2d'));
    }

    for (var i=0;i<brushCount;i++) {
      var brushCanvas = document.createElement('canvas');
      brushCanvas.width = 30;
      brushCanvas.height = 30;
      var brushContext = brushCanvas.getContext('2d');
      var grd=brushContext.createRadialGradient(
        brushCanvas.width / 2, brushCanvas.height / 2,
        brushCanvas.width / 4,
        brushCanvas.width / 2, brushCanvas.height / 2,
        brushCanvas.width / 2);
      var greyval = 255-Math.floor((i/brushCount)*255);
      grd.addColorStop(0,"rgba(" + greyval + "," + greyval + "," + greyval + ",1)");
      grd.addColorStop(1,"rgba(" + greyval + "," + greyval + "," + greyval + ",0)");
      brushContext.fillStyle=grd;
      brushContext.fillRect(0,0,brushCanvas.width, brushCanvas.height);
      var brushImage = new Image(brushCanvas.width, brushCanvas.height);
      brushImage.src = brushContext.canvas.toDataURL();
      brushImgs.push(brushImage);
    }

    $(".drawing-canvas").mousedown(function(e){
      if (locked || noCanvas) {
      } else {
        requestAnimationFrameID = window.requestAnimationFrame(testAnimationFrame);
        // window resizing scaling factor 
        mult = parseInt($(".drawing-canvas .canvas").css('width')) / canvasSize[0];
        var wacom = getWacomPlugin();
        if (usingWacom()) {
          var pt = getWacomPoint(e);
          // the pen location (px)
          var tabX = pt.x;
          var tabY = pt.y;
          // canvas position on page (px)
          var canvasX = (e.pageX-$(contexts[0].canvas).offset().left);
          var canvasY = (e.pageY-$(contexts[0].canvas).offset().top);
          // pen location on canvas (scaled px)
          penOffset = [tabX - canvasX, tabY - canvasY];
          // pen location on canvas (unscaled px)
          previousLoc = [[(tabX - penOffset[0])/mult, (tabY - penOffset[1])/mult]];
          penDown = true;
        } else {
          var tabX = e.pageX;
          var tabY = e.pageY;
          var canvasX = (e.pageX-$(contexts[0].canvas).offset().left);
          var canvasY = (e.pageY-$(contexts[0].canvas).offset().top);
          penOffset = [tabX - canvasX, tabY - canvasY];
          previousLoc = [[(tabX - penOffset[0])/mult, (tabY - penOffset[1])/mult]];
          penDown = true;
        }
        previousPenAttributes = getPointerData(e);
        addToUndoStack();
      }
    });

    $(window).mouseup(function(e){
      window.cancelAnimationFrame(requestAnimationFrameID);
      if (penDown) {
        penDown = false;
        stampLayer();
        storyboardState.setLayerDirty(currentLayer);
        pointerBuffer = [];
      }
    });
  });

  var hintImage = function(layer) {
    var hint = contexts[layer].getImageData(0,0,canvasSize[0],canvasSize[1]);
    contexts[layer].putImageData(hint,0,0);
  };

  var addToUndoStack = function(layer) {
    if (layer) {} else { layer = currentLayer; };

    if (undoPosition != 0) {
      var len = undoStack.length;
      undoStack = undoStack.slice(0, len-undoPosition);
      undoPosition = 0;
    }
    if (undoStack.length >= MAXUNDOS) {
      undoStack = undoStack.slice(1, undoStack.length);
    }
    undoStack.push([contexts[layer].getImageData(0,0,canvasSize[0],canvasSize[1]), layer]);
    contexts[layer].putImageData(undoStack[undoStack.length-1][0], 0,0);


  };

  var undo = function() {
    if (undoPosition == 0) {
      addToUndoStack();
      undoPosition++;
    }
    if (undoStack.length-undoPosition > 0) {
      
      console.log(undoStack.length);

      undoPosition++;
      var undoState = undoStack[undoStack.length-undoPosition];
      contexts[undoState[1]].putImageData(undoState[0], 0,0);
    } else {
    }

    //console.log(undoStack)
  };

  var redo = function() {
    if (undoStack.length-undoPosition < undoStack.length-1) {
      undoPosition--;
      var undoState = undoStack[undoStack.length-undoPosition];
      contexts[undoState[1]].putImageData(undoState[0], 0,0);
    } else {
    }
  };

  var stampLayer = function() {
    var stampImage = new Image(canvasSize[0],canvasSize[1]);
    stampImage.src = drawContexts[1].canvas.toDataURL();
    contexts[currentLayer].globalAlpha = 1;
    contexts[currentLayer].globalCompositeOperation = 'source-over';
    contexts[currentLayer].drawImage(stampImage, 0,0 );
    drawContexts[0].clearRect(0, 0, canvasSize[0], canvasSize[1]);
    drawContexts[1].clearRect(0, 0, canvasSize[0], canvasSize[1]);
  };

  var drawLine = function(context, point1, point2, penattributes1, penattributes2) {
    var dist = Math.max(Math.floor(Math.sqrt(Math.pow(point2[0]-point1[0],2)+Math.pow(point2[1]-point1[1],2))),1);
    for (var i=0;i<=dist;i++) {
      var angle     = penattributes1.angle + ((penattributes2.angle - penattributes1.angle)*(i/dist));
      var angle     = penattributes1.angle;
      var tilt      = penattributes1.tilt  + ((penattributes2.tilt  - penattributes1.tilt)*(i/dist));
      var pressure  = penattributes1.pressure  + ((penattributes2.pressure  - penattributes1.pressure)*(i/dist));
      var eraser    = penattributes2.eraser;
      var x = (point2[0]-point1[0])*(i/(dist))+point1[0];
      var y = (point2[1]-point1[1])*(i/(dist))+point1[1];
      var blend = 0;
      if (eraser) {
        contexts[currentLayer].globalCompositeOperation = 'destination-out';
        var size = (36 * window.devicePixelRatio * pressure);
        contexts[currentLayer].globalAlpha = 1;
        blend = 1;
      } else {
        drawContexts[0].globalCompositeOperation = 'darker';
        var size = 1+ (brushProperties.size * (-Math.log(1-pressure+0.0001)));
        blend = ((1-tilt)*pressure) +(brushProperties.opacity/100);
        drawContexts[0].globalAlpha = 1;
      }
      var b = Math.min(Math.floor(blend*255),240);
      if (b) {
        drawRotatedImage(brushImgs[b], x, y, angle, size+(size*tilt*2), size, eraser);
      }
    }
  };

  var drawCurve = function(curve, subDivs, penattributes1, penattributes2) {
    var angleDelta     = (penattributes2.angle - penattributes1.angle);
    var tiltDelta      = (penattributes2.tilt  - penattributes1.tilt);
    var pressureDelta  = (penattributes2.pressure  - penattributes1.pressure);
    var eraser         = penattributes2.eraser;
    var tpenAttributes2;
    var prevp;
    for (var i=0;i<=subDivs;i++) {
      var point = jsBezier.pointOnCurve(curve, (i/subDivs));
      var angle = penattributes1.angle + ((angleDelta/subDivs)*i);
      var angle = penattributes1.angle;
      var tilt = penattributes1.tilt + ((tiltDelta/subDivs)*i);
      var pressure = penattributes1.pressure + ((pressureDelta/subDivs)*i);
      var tpenAttributes1 = {angle: angle, tilt: tilt, pressure: pressure, eraser: eraser};
      if (i>0) {
        drawLine(drawContexts[0], [point.x, point.y], [prevp.x, prevp.y], tpenAttributes1, tpenAttributes2);
      }
      prevp = point;
      tpenAttributes2 = tpenAttributes1;
    }
  };

  var getWacomPoint = function(e) {
    var wacom = getWacomPlugin();
    var x, y;
    // right now, we only support the models we have been able to test
    if (wacom.penAPI.tabletModel == 'Intuos PT S') {
      x = (wacom.penAPI.posX / 15200) * screen.width - (e.screenX - e.pageX);
      y = (wacom.penAPI.posY / 9500) * screen.height - (e.screenY - e.pageY);
    }
    /* removing for now since these numbers are actually wrong
    else if (wacom.penAPI.tabletModel == 'Intuos3 9x12') {
      x = (wacom.penAPI.posX / 51006) * screen.width - (e.screenX - e.pageX);
      y = (wacom.penAPI.posY / 38440) * screen.height - (e.screenY - e.pageY);
    }
    */
    else if (wacom.penAPI.tabletModel = 'Cintiq 13HD') {  // tableModelID == "DTK-1300"
      x = ((wacom.penAPI.posX)-600)/((60000-(600*2))/1920);
      y = ((wacom.penAPI.posY)-400)/((33874-(400*2))/1080);
    }
    else {
      x = e.pageX;
      y = e.pageY;
    }
    return {x: x, y: y};
  };

  var testAnimationFrame = function() {
    requestAnimationFrameID = window.requestAnimationFrame(testAnimationFrame);
    for (var i = 0; i < pointerBuffer.length; i++) {
      var penAttributes = pointerBuffer[i];
      var currentPoint = penAttributes.point;
      var dist = Math.floor(Math.sqrt(Math.pow(previousLoc[previousLoc.length-1][0]-currentPoint[0],2)+Math.pow(previousLoc[previousLoc.length-1][1]-currentPoint[1],2)));
      if (dist > 0 && (currentPoint[0] !== previousLoc[previousLoc.length-1][0])) {
        if (previousLoc.length > 1 && dist > 3) {
          var curve = [];
          curve.push({x: previousLoc[previousLoc.length-1][0], y: previousLoc[previousLoc.length-1][1]});
          var midX = previousLoc[previousLoc.length-1][0] + ((previousLoc[previousLoc.length-1][0] - previousLoc[previousLoc.length-2][0]) * 0.3) + ((currentPoint[0] - previousLoc[previousLoc.length-1][0]) * 0.3);
          var midY = previousLoc[previousLoc.length-1][1] + ((previousLoc[previousLoc.length-1][1] - previousLoc[previousLoc.length-2][1]) * 0.3) + ((currentPoint[1] - previousLoc[previousLoc.length-1][1]) * 0.3);
          curve.push({x: midX, y: midY});
          curve.push({x: currentPoint[0], y: currentPoint[1]});
          drawCurve(curve, Math.max(Math.floor(dist/5), 2), penAttributes, previousPenAttributes);
        } else {
          drawLine(drawContexts[0], previousLoc[previousLoc.length-1], currentPoint, previousPenAttributes, penAttributes);
        }
        previousLoc.push(currentPoint);
        previousPenAttributes = penAttributes;
        renderDrawingLayer(currentColor[currentLayer]);
      }
    }
    pointerBuffer = [];
  }

  var getPointerData = function(e) {
    var wacom;
    wacom = getWacomPlugin();
    var tabX, tabY;
    if (usingWacom()) {
      var pt = getWacomPoint(e);
      tabX = pt.x;
      tabY = pt.y;
    }
    else {
      tabX = e.pageX;
      tabY = e.pageY;
    }
    var currentPoint = [(tabX - penOffset[0])/mult, (tabY - penOffset[1])/mult];
    if (usingWacom()) {
      var angle = Math.atan2(wacom.penAPI.tiltY, wacom.penAPI.tiltX) * TO_DEGREES;
      var tilt = Math.max(Math.abs(wacom.penAPI.tiltY),Math.abs(wacom.penAPI.tiltX) );
      if (tilt == 0) {
        tilt = 0.5;
      }
      var pressure = wacom.penAPI.pressure;
      var eraser = wacom.penAPI.isEraser;
    } else {
      var angle = 0;
      var tilt = 0.5;
      var pressure = fakePressure;
      var eraser = e.shiftKey;
    }
    penAttributes = {point: currentPoint, angle: angle, tilt: tilt, pressure: pressure, eraser: eraser};
    return penAttributes;
  }

  $(document).ready(function() {
    $(window).mousemove(function(e){
      if (penDown == true && locked == false && noCanvas == false) {
        penAttributes = getPointerData(e);
        pointerBuffer.push(penAttributes);
      }
    });
  });

  var renderDrawingLayer = function(color) {
    var imageData = drawContexts[0].getImageData(0,0,canvasSize[0],canvasSize[1]);
    var targetImageData = drawContexts[1].createImageData(canvasSize[0],canvasSize[1]);
    var pix = targetImageData.data;
    for (var i = 0; i < pix.length; i += 4) {
      pix[i  ] = color[0]; 
      pix[i+1] = color[1]; 
      pix[i+2] = color[2]; 
      if (imageData.data[i] == 0){
        pix[i+3] = 0;
      } else {
        pix[i+3] = (255-imageData.data[i]) * (imageData.data[i+3]/256); // alpha channel
      }
    }
    drawContexts[1].putImageData(targetImageData, 0,0);
  };

  var drawRotatedImage = function(image, x, y, angle, w, h, eraser) { 
    if (eraser) {
      var layer = contexts[currentLayer];
    } else {
      var layer = drawContexts[0];
    }
    layer.save(); 
    layer.translate(x, y);
    layer.rotate(angle * TO_RADIANS);
    layer.drawImage(image, -(w/2), -(h/2), w, h);
    layer.restore(); 
  };
  
  var getWacomPlugin = function() {
    return document.getElementById('wtPlugin');
  };

  var setLayer = function(layer) {
    var oldColor = getColor();
    var oldLayer = currentLayer;
    currentLayer = layer;
    $("#layer-1-active-visible").css('z-index', 100 + (layer*2+1));
    emitter.emit('color:change', currentColor[currentLayer], oldColor);
    emitter.emit('layer:change', currentLayer, oldLayer);
  };

  var getLayer = function() { return currentLayer; };

  var setColor = function(color) {
    var oldColor = currentColor[currentLayer];
    currentColor[currentLayer] = color;
    emitter.emit('color:change', currentColor[currentLayer], oldColor);
  };

  var getColor = function() { return currentColor[currentLayer]; };

  var setBrush = function(brush) {
    brushProperties = brush;
  };

  var getBrush = function() { return brushProperties; };

  var getLayerImage = function(layer) {
    var value = contexts[layer].canvas.toDataURL();
    hintImage(layer);
    return value;
  };

  var getFlatImage = function() {
    //undoStack = [];
    var buffer = document.createElement('canvas');
    buffer.width = canvasSize[0];
    buffer.height = canvasSize[1];
    var context = buffer.getContext('2d');
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = "#fff";
    context.fillRect(0,0,canvasSize[0],canvasSize[1]);
    for (var i = 0; i < contexts.length; i ++) {
      var stampImage = new Image(canvasSize[0],canvasSize[1]);
      stampImage.src = contexts[i].canvas.toDataURL();
      hintImage(i);
      context.drawImage(stampImage, 0,0 );
    }
    var largeFlat = buffer.toDataURL('image/jpeg', 0.6);
    var stampImage = new Image(canvasSize[0],canvasSize[1]);
    stampImage.src = largeFlat;
    var buffer = document.createElement('canvas');
    resizeCanvasImage(stampImage, buffer, 200,200);
    var smallFlat = buffer.toDataURL('image/jpeg', 0.9);
    return [largeFlat, smallFlat];
  };

  var resizeCanvasImage = function (img, canvas, maxWidth, maxHeight) {
    var imgWidth = img.width, 
    imgHeight = img.height;
    var ratio = 1, ratio1 = 1, ratio2 = 1;
    ratio1 = maxWidth / imgWidth;
    ratio2 = maxHeight / imgHeight;
    // Use the smallest ratio that the image best fit into the maxWidth x maxHeight box.
    if (ratio1 < ratio2) {
      ratio = ratio1;
    }
    else {
      ratio = ratio2;
    }
    var canvasContext = canvas.getContext("2d");
    var canvasCopy = document.createElement("canvas");
    var copyContext = canvasCopy.getContext("2d");
    var canvasCopy2 = document.createElement("canvas");
    var copyContext2 = canvasCopy2.getContext("2d");
    canvasCopy.width = imgWidth;
    canvasCopy.height = imgHeight;  
    copyContext.drawImage(img, 0, 0);
    // init
    canvasCopy2.width = imgWidth;
    canvasCopy2.height = imgHeight;        
    copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);
    var rounds = 2;
    var roundRatio = ratio * rounds;
    for (var i = 1; i <= rounds; i++) {
      // tmp
      canvasCopy.width = imgWidth * roundRatio / i;
      canvasCopy.height = imgHeight * roundRatio / i;
      copyContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvasCopy.width, canvasCopy.height);
      // copy back
      canvasCopy2.width = imgWidth * roundRatio / i;
      canvasCopy2.height = imgHeight * roundRatio / i;
      copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);
    } // end for
    // copy back to canvas
    canvas.width = imgWidth * roundRatio / rounds;
    canvas.height = imgHeight * roundRatio / rounds;
    canvasContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvas.width, canvas.height);
  };

  var loadFlatImage = function(url) {
    undoStack = [];
    clearCanvases();
    $('.drawing-canvas').children().show();

    $("#flat-image").attr("src", url);
    $("#flat-image").css("display", "block");
    editMode = false;
    noCanvas = false;
  };

  var noImage = function(caption) {
    noCanvas = true;
    $("#flat-image").css("display", "none");
    $('.drawing-canvas').children().hide();
    $('.drawing-canvas .caption').html(caption);
    $('.drawing-canvas .caption').show();
  }

  var clearCanvases = function() {
    for (var i=0;i<contexts.length;i++) {
      contexts[i].clearRect (0, 0, canvasSize[0], canvasSize[1]);
    }
    for (var i=0;i<drawContexts.length;i++) {
      drawContexts[i].clearRect (0, 0, canvasSize[0], canvasSize[1]);
    }
  };

  var loadLayers = function(layers, currentBoard, copyAfter) {
    locked = true;
    editMode = true;
    var imagesLoaded = 0;
    log('loadLayers', layers.length)
    for (var i=0;i<layers.length;i++) {
      var image = new Image();
      image.onload = function() {
        log('image.onload');
        imagesLoaded++;
        if(imagesLoaded == layers.length){
          allLoaded(layers, currentBoard, copyAfter);
        }
      }
      image.onerror = function() {
        imagesLoaded++;
        if(imagesLoaded == layers.length){
          allLoaded(layers, currentBoard, copyAfter);
        }
      }
      image.crossOrigin = '';
      image.src = layers[i];
    }
  };

  var copy = function() {
    if (getEditMode() && noCanvas == false) {
      console.log("COPIED!!!!!!!")
      copyLayers = [];
      for (var i=0;i<contexts.length;i++) {
        var newCanvas = document.createElement('canvas');
        var context = newCanvas.getContext('2d');
        newCanvas.width = canvasSize[0];
        newCanvas.height = canvasSize[1];
        context.drawImage(contexts[i].canvas, 0, 0);
        copyLayers.push(newCanvas);
      }
    }
    else {
      storyboardState.preLoadLayers(true);
    }
  };

  var paste = function() {
    if (copyLayers.length == 3) {
      if (fountainManager.getCursorHasImages()) {
      } else {
        fountainManager.newBoard();
      }
      locked = false;
      editMode = true;
      for (var i=0;i<copyLayers.length;i++) {
        addToUndoStack(i);
      }
      clearCanvases();
      $('.drawing-canvas').children().show();
      $("#flat-image").css("display", "none");
      for (var i=0;i<copyLayers.length;i++) {
        contexts[i].drawImage(copyLayers[i], 0, 0, canvasSize[0], canvasSize[1]);
        storyboardState.setLayerDirty(i);
      }
      storyboardState.setThumb(getFlatImage()[1]);
    }
  };

  var newSketch = function() {
    noCanvas = false;
    locked = false;
    clearCanvases();
    $('.drawing-canvas').children().show();
    $("#flat-image").css("display", "none");
    storyboardState.setLayerDirty(currentLayer);
    storyboardState.setThumb(getFlatImage()[1]);
  };

  var drawOnCanvas = function(layers, i) {
    var image = new Image();
    image.crossOrigin = '';
    image.src = layers[i];
    image.onload = function() {
      loadedLayer++;
      contexts[i].drawImage(image, 0, 0, canvasSize[0], canvasSize[1]);
      if (loadedLayer == totalLayers) {
        $("#flat-image").css("display", "none");
      }
    };
    image.onerror = function() {
      loadedLayer++;
      if (loadedLayer == totalLayers) {
        $("#flat-image").css("display", "none");
      }
    }

  };

  var loadedLayer = 0;
  var totalLayers = 0;

  var allLoaded = function(layers, currentBoard, copyAfter) {
    if (currentBoard === storyboardState.getCurrentBoard()){
      locked = false;
      loadedLayer = 0;
      totalLayers = layers.length;
      for (var i=0;i<layers.length;i++) {
        drawOnCanvas(layers, i);
      }
      if (copyAfter) { 
        var timeOutCopy = window.setTimeout(copy, 100); 
      };
    }
  };

  var getEditMode = function() { return editMode; };

  var getLighboxMode = function() { return lightboxMode; };

  var toggleLightboxMode = function() {
    if (lightboxMode) {
      lightboxMode = false;
      $("#lightbox-image").css("display", "none");
    } else {
      lightboxMode = true;
      $("#lightbox-image").css("display", "block");
    }
    emitter.emit('lightboxmode:change', lightboxMode);
  }

  var getPenDown = function() { return penDown; };

  var sketchpane = window.sketchpane = {
    emitter: emitter,
    setLayer: setLayer,
    getLayer: getLayer,
    setColor: setColor,
    getColor: getColor,
    setBrush: setBrush,
    getBrush: getBrush,
    undo: undo,
    redo: redo,
    getLayerImage: getLayerImage,
    getFlatImage: getFlatImage,
    loadFlatImage: loadFlatImage,
    loadLayers: loadLayers,
    getEditMode: getEditMode,
    newSketch: newSketch,
    noImage: noImage,
    copy: copy,
    paste: paste,
    getLighboxMode: getLighboxMode,
    toggleLightboxMode: toggleLightboxMode,
    getPenDown: getPenDown
  };

  // force initial event fires
  $(document).ready(function() {
    process.nextTick(function() {
      setColor(getColor());
      setLayer(getLayer());
      toggleLightboxMode();
    });
  });

}).call(this);