/*

keep state
provide status feedback
queue new renders
cleanup


*/

;(function() {
  'use strict';

  var ffmpeg = require('fluent-ffmpeg');
  var fs = require('fs');

  ffmpeg.setFfmpegPath(window.location.pathname.split("/").slice(0, window.location.pathname.split("/").length-1).join("/")+"/tools/ffmpeg");
  
  var tmp = require('tmp');

  var sceneNumber;
  var sceneName;

  var idle = true;

  var renderQueue = [];


  var numberToTime = function(number) {
    var mins = Math.floor(number/60);
    var secs = Math.ceil(number-(mins*60));
    return (pad(mins, 2) + ":" + pad(secs, 2));
  };

  var pad = function (n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  };


  var renderAllScenes = function() {
    var chunks = fountainManager.getScriptChunks();
    var scene = 0;
    for (var i = 0; i < chunks.length; i++) { 
      if (chunks[i].type == "scene_heading") {
        scene++;
          renderQueue.push(scene);
          console.log(chunks[i].text)
      }
    }
    //processRenderQueue();
  }


  var processRenderQueue = function() {
    if (renderQueue.length > 0) {
      console.log("PROCESSING RENDER QUEUE: " + renderQueue.length + " JOBS LEFT.");
      sceneNumber = renderQueue[0];
      sceneRender(renderQueue[0]);
      renderQueue.shift();

    }
  }



  var renderCurrentScene = function() {
    if (idle) {
      idle = false;
      sceneNumber = fountainManager.getScriptChunks()[fountainManager.getCursor().chunkIndex].scene;
      sceneRender(sceneNumber);
    } else {
      console.log("currently rendering, cant render!")
    }

    //renderFrame(0, [[0,1000],[1,1000],[2,1000]])

  };

  var drawText = function(context, text, x, y, size, align, color, lineWidth, font){
    context.font = size + 'pt ' + font;
    context.lineWidth = lineWidth;
    context.miterLimit = 2;
    context.lineJoin = "round";
    context.textAlign = align;
    if (lineWidth !== 0){
      context.strokeStyle = '#000';
      context.fillStyle = '#000';
      context.strokeText(text, x, y);
    }
    context.fillStyle = color;
    context.fillText(text, x, y);
  };

  var drawFrameOverlays = function(imageFile, shot, renderData) {          
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

    var image = new Image();
    image.onload = function() {
      canvas.width = image.width;
      canvas.height = image.height+100;  
      context.fillStyle = "#000";
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(this, 0, 50);

      drawText(context, renderData.scene + "." + pad(renderData.shot, 3), 10, 25, 14, "left", "#ccc", 0, "Menlo");
      drawText(context, (renderData.duration/1000) + " seconds - " + Math.ceil((renderData.duration/1000)*24) + "f", 10, 40, 10, "left", "#555", 0, "Menlo");
      drawText(context, "+" + numberToTime(renderData.currentTime/1000), 100, 25, 14, "left", "#888", 0, "Menlo");
      drawText(context, renderData.date, 10, image.height+80, 10, "left", "#444", 0, "Proxima Nova");
      drawText(context, renderData.sceneHeader, image.width/2, 30, 12, "center", "#555", 10, "Proxima Nova");
      drawText(context, "IMG: " + imageFile, image.width-10, 30, 12, "right", "#888", 0, "Menlo");

      if (renderData.caption) {
        drawText(context, renderData.caption, image.width/2, image.height+25, 20, "center", "#fff", 10, "Helvetica");
      } else {
        drawText(context, renderData.action, image.width/2, image.height+80, 12, "center", "#888", 0, "Proxima Nova");
      }

      var imageData = canvas.toDataURL();
      imageData = imageData.replace(/^data:image\/\w+;base64,/, '');
      var file = tmp.tmpdir + 'z-' + shot + '.png';
      fs.writeFile(file, imageData, 'base64');

    };
    
    image.onError = function(err) {
      console.log(err)
    }

    image.src = localSource.imageUrl(imageFile) + "-large.jpeg";
  };

  var sceneRender = function(sceneNumber) {
    var outlineItem = fountainManager.getOutlineItem(sceneNumber-1);
    sceneName = outlineItem.title;
    var scene = 0;
    var chunks = fountainManager.getScriptChunks();
    var frameArray = [];
    var baseImageFile;
    var shot = 0;
    var currentTime = 0;

    for (var i = 0; i < chunks.length; i++) { 
      if (chunks[i].type == "scene_heading") {
        scene++;
      } else {
        if (scene == sceneNumber) {
          if (chunks[i].images) {
            for (var i2 = 0; i2 < chunks[i].images.length; i2++) { 
              baseImageFile = chunks[i].images[i2][0].file;
              var renderData = {
                scene: sceneNumber, 
                shot: shot,
                duration: chunks[i].images[i2][0].duration, 
                currentTime: currentTime, 
                sceneHeader: "SCENE " + sceneNumber + ": " + sceneName + " - " + outlineItem.slugline, 
                date: new Date().toLocaleDateString(), 
              }
              if (chunks[i].character) {
                renderData.caption = chunks[i].character + ": ";
                if (chunks[i].parenthetical) { renderData.caption = renderData.caption + chunks[i].parenthetical + " "};
                renderData.caption = renderData.caption + chunks[i].text;
              } else {
                renderData.action = chunks[i].text
              }
              drawFrameOverlays(baseImageFile, shot, renderData);
              frameArray.push([shot, chunks[i].images[i2][0].duration]);
              currentTime = currentTime + chunks[i].images[i2][0].duration;
              shot++;
            }
          } else {
            var renderData = {
              scene: sceneNumber, 
              shot: shot,
              duration: chunks[i].duration, 
              currentTime: currentTime, 
              sceneHeader: "SCENE " + sceneNumber + ": " + sceneName + " - " + outlineItem.slugline, 
              date: new Date().toLocaleDateString(), 
            }
            if (chunks[i].character) {
              renderData.caption = chunks[i].character + ": ";
              if (chunks[i].parenthetical) { renderData.caption = renderData.caption + chunks[i].parenthetical + " "};
              renderData.caption = renderData.caption + chunks[i].text;
            } else {
              renderData.action = chunks[i].text
            }
            drawFrameOverlays(baseImageFile, shot, renderData);
            frameArray.push([shot, chunks[i].duration]);
            shot++;
            currentTime = currentTime + chunks[i].duration;
          }
        }
      }          
    }

    setTimeout(function(){renderFrames(frameArray)},2000);
  };

  var renderFrames = function(frameArray) {
    var currentframe = 0;
    renderFrame(currentframe, frameArray);
    //mergeTogether(0, frameArray)
    //console.log(tmp.tmpdir);
  }

  var renderFrame = function(currentframe, frameArray) {
    var proc = ffmpeg( tmp.tmpdir + 'z-' + frameArray[currentframe][0] + '.png')
      .videoBitrate(10000)
      .loop(frameArray[currentframe][1]/1000)
      .fps(24)
      .on('end', function() {
        if (currentframe+1 < frameArray.length) {
          console.log(currentframe+1 + " / " + frameArray.length)
          renderFrame(currentframe+1, frameArray);
        } else {
          console.log("FINISHED! " + (currentframe+1) + " / " + frameArray.length)
          setTimeout(function(){mergeTogether(0, frameArray)},2000)
        }
      })
      .on('error', function(err) {
        console.log('an error happened: ' + err.message);
        console.log(err);
      })
      .save(tmp.tmpdir + currentframe + '.avi');
  };

  var exec = require('child_process').exec;

  var mergeTogether = function(currentFrame, frameArray) {
    console.log("merging together")


    var proc;

    var baseTmpFile;

    var outputFilename = localSource.getScriptpath() + '/' + fountainManager.getTitle().split(" ").join("-") + '-' + pad(sceneNumber,3) + "-" + (sceneName.split(" ").join("-")) + '-' + (new Date().toLocaleDateString().split("/").join("-")) + '.m4v'

    if (currentFrame == 0) {
      proc = ffmpeg();
    } else {
      proc = ffmpeg(tmp.tmpdir + 'tmp-' + currentFrame + '-base.avi');
      baseTmpFile = tmp.tmpdir + 'tmp-' + currentFrame + '-base.avi';
    }



    proc.fps(24)
      .on('end', function() {

        if (currentFrame+1 < frameArray.length) {
          console.log(currentFrame+1 + " / " + frameArray.length)
          setTimeout(function(){mergeTogether(currentFrame, frameArray)},2000)
        } else {
          console.log('done stitching together.');
          exec('open -a "/Applications/QuickTime Player.app" ' + outputFilename)
          cleanup(frameArray);
          idle = true;
          processRenderQueue();
        }

        if (baseTmpFile) {
          fs.unlinkSync(baseTmpFile)
        } 

      })
      .on('error', function(err) {
        console.log(err.message);
      })
      .on('progress', function(progress) {
        console.log(progress);
      });

    for (var i = currentFrame; i < (currentFrame+Math.min((frameArray.length - currentFrame),100)); i++) { 
      proc.input(tmp.tmpdir + i + '.avi');
      console.log(i);
    }

    currentFrame = (currentFrame+Math.min((frameArray.length - currentFrame),100))

    console.log("currentFrame: " + currentFrame)

    if (currentFrame == (frameArray.length)) {
      if (frameArray.length == 1) {
        proc.videoBitrate(1000).save(outputFilename);
      } else {
        proc.videoBitrate(1000).mergeToFile(outputFilename, localSource.getScriptpath());
      }
      
      console.log("rendering final: " + outputFilename)
    } else {
      proc.videoBitrate(10000).mergeToFile(tmp.tmpdir + 'tmp-' + currentFrame + '-base.avi', localSource.getScriptpath());
    }
  };

  var cleanup = function(frameArray) {
    for (var i = 0; i < frameArray.length; i++) { 
      fs.unlinkSync(tmp.tmpdir + i + '.avi');
      fs.unlinkSync(tmp.tmpdir + 'z-' + i + '.png');
    }
  }


  var videoRenderer = window.videoRenderer = {
    renderCurrentScene: renderCurrentScene,
    renderAllScenes: renderAllScenes,
    sceneRender: sceneRender,
  };

}).call(this);