/*

print dialogue box:
  
location groupings
character groupings

*/

;(function() {
  'use strict';

  var PDFDocument = require('pdfkit');
  var fs = require('fs');
  //var blobStream  = require('blob-stream');

  var scenePrint = function(sceneNumber, options) {

    if (!options) {
      var options = {};
    }

    var DEFAULT_OPTIONS = {
      columns: 4,
      orientation: 'portrait',
      boardWorksheet: false,
      worksheetLines: 3,
      repeatEmptyBoards: false,
      drawGuides: true,
      printWorksheetLines: false,
      printHeader: true,
      margin: 21,
      innerMargin: 7,
      headerHeight: 30,
      textHeight: 20  
    };

    for (var k in DEFAULT_OPTIONS){
      if (!(k in options)) {
        options[k] = DEFAULT_OPTIONS[k]
      }
    }

    if (!options.printHeader) { options.headerHeight = 0 }

    var data = [];
    var chunks = fountainManager.getScriptChunks()
    var scene = 0;
    var lineNumber = 0;
    var boards = 0;
    var elements = 0;
    var lines = 0;
    var shots = 0;

    var outlineData = {};
    var sceneStartTime = 0;

    // parse the data
    for (var i = 0; i < chunks.length; i++) { 
      if (chunks[i].type == "scene_heading") {
        scene++;
        var outlineItem = fountainManager.getOutlineItem(sceneNumber-1);
        outlineData = {slugline: outlineItem.slugline, synopsis: outlineItem.synopsis, title: outlineItem.title, sceneNumber: sceneNumber};
      } else {
        if (scene == sceneNumber) {
          sceneStartTime = Math.min(chunks[i].time, sceneStartTime);
          elements++;
          var element = {elements: elements, text: chunks[i].text}
          if (chunks[i].images) {
            element.image = chunks[i].images[0][0].file
            if (chunks[i].images[0][0].continued) {
              element.continued = 1;
            }
          }
          if (chunks[i].character) {
            lines++;
            element.character = chunks[i].character;
          }
          data.push(element);
          if (chunks[i].images) {
            boards++;
            if (chunks[i].images.length > 1) {
              for (var i2 = 1; i2 < chunks[i].images.length; i2++) { 
                boards++;
                if (chunks[i].images[i2][0].continued) {
                  data.push({image: chunks[i].images[i2][0].file, continued: 1});
                } else {
                  shots++;
                  data.push({image: chunks[i].images[i2][0].file});
                }
              }
              element.connected = 1;
            }
          }
        }          
      }
    }

    var doc = new PDFDocument({margin: 0, layout: options['orientation'], size: 'LETTER'});
    doc.pipe(fs.createWriteStream('output.pdf'))
    //var stream = doc.pipe(blobStream());
    doc.font('fonts/p.ttf');
    doc.fontSize(5);

    var width = doc.page.width;
    var height = doc.page.height;

    var imageWidth = (width-(options.margin*2)-((options['columns']-1)*options.innerMargin))/options['columns']
    var imageHeight = imageWidth*(1/aspectRatio.getAspectRatio());
    var moduleHeight = imageHeight+options.textHeight;

    if (options.printWorksheetLines) {
      moduleHeight = moduleHeight + ((options.worksheetLines-1)*15);
    }

    var rows = Math.floor((height-((options.margin+5)*2)-options.headerHeight)/moduleHeight);

    if (options.boardWorksheet) {
      data.splice(1);
      for (var i2 = 1; i2 < (options['columns']*rows); i2++) { 
        data.push({text: ""});
      }
    }

    if ( rows > 1 ) {
      var extra = ((((height-((options.margin+5)*2)-options.headerHeight)/moduleHeight) - rows) * moduleHeight) / (rows - 1);
      moduleHeight = moduleHeight + extra;
    }

    var lastImage = false;
    var page = 1;
    var pageCount = Math.ceil(data.length / (rows * options['columns']));

    var printDate = new Date();

    var drawHeader = function() {
      doc.fontSize(5);
      doc.text(outlineData.slugline, options.margin, 20, {width: 6*72, ellipsis: true, lineBreak: false, height: 5});
      doc.text("PAGE " + page + "/" + pageCount, width-options.margin-(2*72), 20, {width: 2*72, ellipsis: true, lineBreak: false, height: 5, align: 'right'});
      doc.text(printDate.toLocaleDateString(), width-options.margin-(2*72), 25, {width: 2*72, ellipsis: true, lineBreak: false, height: 5, align: 'right'});
      doc.fontSize(10);
      doc.moveUp(0);
      doc.fillOpacity(1);
      doc.text('SCENE ' + (sceneNumber) + ': ' + outlineData.title , options.margin, 25, {width: 6*72, ellipsis: true, continued: false, height: options.textHeight-(10)});
      doc.fontSize(3.5);
      doc.moveUp(0.2);
      doc.text("BOARDS: " + boards + "    SHOTS: " + shots + "    ELEMENTS: " + elements + "    LINES: " + lines, {width: 4*72, ellipsis: true, continued: false, height: 18});
      doc.text(outlineData.synopsis , (3.65*72), 20, {width: width - 4.5*72, ellipsis: true, continued: false, height: 23, columns: 3, columnGap: 5});
      doc.fontSize(5);
    }

    var drawStartCap = function() {
      doc.lineWidth(1.5)
        .moveTo(xPoint + 2, yPoint)
        .lineTo(xPoint, yPoint)
        .lineTo(xPoint, yPoint+imageHeight)
        .lineTo(xPoint + 2, yPoint+imageHeight)
        .stroke();
    }

    var drawEndCap = function() {
      doc.lineWidth(1.5)
        .moveTo(xPoint + imageWidth - 2, yPoint)
        .lineTo(xPoint + imageWidth, yPoint)
        .lineTo(xPoint + imageWidth, yPoint+imageHeight)
        .lineTo(xPoint + imageWidth - 2, yPoint+imageHeight)
        .stroke();
    }


    if (options.printHeader) { drawHeader(); };

    var currentShot = 0;
    var currentBoard = 0;

    for (var i = 0; i < data.length; i++) { 
      var xCursor = i % options['columns'];
      var yCursor = Math.floor(i/options['columns']) % rows;
      var xPoint = options.margin+(xCursor*(imageWidth+options.innerMargin));
      var yPoint = options.margin+5+(yCursor*moduleHeight)+options.headerHeight;
      var multipleShots = false;
      if (options.printWorksheetLines) {
        doc.save();
        doc.lineWidth(0.1);
        for (var i2 = 0; i2 < options.worksheetLines; i2++) {
            doc.moveTo(xPoint, yPoint + imageHeight + options.textHeight + ((i2)*15) - 5)
              .lineTo(xPoint + imageWidth, yPoint + imageHeight + options.textHeight + ((i2)*15) - 5)
              .stroke();
        } 
        doc.restore();
      }
      if (data[i].image) {
        lastImage = data[i].image;
        if (!data[i].continued) {
          currentShot++;
          currentBoard = 0;
          if ((i+1) < data.length) {
            if (data[i+1].continued) {
              multipleShots = true;
            } else {
              multipleShots = false;
            }
          }
        } else {
          currentBoard++;
        }
        var shotLabel = "";
        if (multipleShots || data[i].continued) {
          shotLabel = sceneNumber + "." + currentShot + numberToLetter(currentBoard);
        } else {
          shotLabel = sceneNumber + "." + currentShot;
        }
        doc.text(shotLabel, xPoint, yPoint-7, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15, align: 'right'});
        doc.image(localSource.getFullDataPath() + '/images/' + data[i].image + '-large.jpeg', xPoint, yPoint, {width: imageWidth, height: imageHeight});
        doc.strokeOpacity(1).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();

        if (!data[i].continued) {
          drawStartCap();
          doc.text(numberToTime((chunks[i].time-sceneStartTime)/1000), xPoint, yPoint-7, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
          if ((i+2) <= data.length){
            if (!options.repeatEmptyBoards) {
              if (!data[i+1].continued) { 
                drawEndCap();
              }
            } else {
              if (data[i+1].image !== undefined && !data[i+1].continued) { 
                drawEndCap();
              }
            }
          }
        } else {
          if (!options.repeatEmptyBoards) {
            if (!data[i+1].continued) { 
              drawEndCap();
            }
          } else {
            if (data[i+1].image !== undefined && !data[i+1].continued) { 
              drawEndCap();
            }
          }
        }
      } else {
        if (lastImage) {
          if (options.repeatEmptyBoards) {
            doc.save();
            doc.fillOpacity(0.5);
            doc.image(localSource.getFullDataPath() + '/images/' + lastImage + '-large.jpeg', xPoint, yPoint, {width: imageWidth, height: imageHeight})
            doc.strokeOpacity(1).dash(1, {space: 1}).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
            doc.restore();            
            if ((i+2) <= data.length){
              if ((data[i+1].image !== undefined && !data[i+1].continued) ) { 
                drawEndCap();              
              }
            }        
          } else {
            doc.save();
            doc.strokeOpacity(1).dash(1, {space: 1}).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
            doc.restore();     
            if (options.drawGuides) {
              doc.save();
              doc.lineWidth(0.05)
                .dash(.2, {space: 1})
                .moveTo(xPoint + (imageWidth/3), yPoint)
                .lineTo(xPoint + (imageWidth/3), yPoint + imageHeight)
                .stroke()
                .moveTo(xPoint + (imageWidth/3*2), yPoint)
                .lineTo(xPoint + (imageWidth/3*2), yPoint + imageHeight)
                .stroke()
                .moveTo(xPoint, yPoint + (imageHeight/3))
                .lineTo(xPoint + imageWidth, yPoint + (imageHeight/3))
                .stroke()
                .moveTo(xPoint, yPoint + (imageHeight/3*2))
                .lineTo(xPoint + imageWidth, yPoint + (imageHeight/3*2))
                .stroke()
              doc.restore();
            }
          }
        }
      }
      if (data[i].text) {
        if (data[i].character) {
          doc.text(data[i].character + ": " + data[i].text, xPoint, yPoint+imageHeight+2, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
        } else {
          doc.text(data[i].text, xPoint, yPoint+imageHeight+2, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
        }        
      }
      if ((xCursor == (options['columns']-1)) && (yCursor == (rows-1)) && ((i+1) < data.length)) {
        doc.addPage();
        page++;
        if (options.printHeader) { drawHeader(); };
      }
    }
    doc.end();
    // stream.on('finish', function() {
    //   url = stream.toBlobURL('application/pdf');
    //   iframe.src = url;
    // });
  };


  var outlinePrint = function(options) {

    if (!options) {
      var options = {};
    }

    var DEFAULT_OPTIONS = {
      columns: 4,
      includeBeats: true,
      orientation: 'landscape',
      boardWorksheet: false,
      worksheetLines: 3,
      repeatEmptyBoards: false,
      drawGuides: true,
      printWorksheetLines: false,
      printHeader: true,
      margin: 21,
      innerMargin: 7,
      headerHeight: 30,
      textHeight: 50  
    };

    for (var k in DEFAULT_OPTIONS){
      if (!(k in options)) {
        options[k] = DEFAULT_OPTIONS[k]
      }
    }

    if (!options.printHeader) { options.headerHeight = 0 }

    var data = [];
    var chunks = fountainManager.getAtoms();
    var scene = 0;
    var lineNumber = 0;
    var elements = 0;
    var lines = 0;
    var shots = 0;

    var scenes = 0;
    var beats = 0;
    var totalLength = 0;
    var boards = 0;


    var outlineData = {};
    var sceneStartTime = 0;

    var beat = {type: 'beat', continued: true};

    // parse the data
    for (var i = 0; i < chunks.length; i++) { 
      if (chunks[i].type == "scene_heading") {
        var outlineItem = fountainManager.getOutlineItem(scene);
        if (chunks[i+1].file) {
          var image = chunks[i+1].file;
        } else {
          var image = false;
        }
        data.push({slugline: outlineItem.slugline, synopsis: outlineItem.synopsis, title: outlineItem.title, image: image, time: outlineItem.time});
        scenes++;
        beats++;
        scene++;
        totalLength = Math.max(outlineItem.time + outlineItem.duration);
      } else {
        if (options.includeBeats){
          if (chunks[i].type == "section" && chunks[i].depth == 4) {
            beat["title"] = chunks[i].text;
            beat["synopsis"] = "";
          }
          if (chunks[i].type == "synopsis") {
            beat["synopsis"] = chunks[i].text;
          }
          if (beat["title"] && chunks[i].type == "image") {
            beat["image"] = chunks[i].file;
            data.push(beat);
            beat = beat = {type: 'beat', continued: true};
            beats++;
          }

          if (chunks[i].type == "image") {
            boards++;
          }
        }


      }
    }

    var doc = new PDFDocument({margin: 0, layout: options['orientation'], size: 'LETTER'});
    doc.pipe(fs.createWriteStream('output.pdf'))
    //var stream = doc.pipe(blobStream());
    doc.font('fonts/p.ttf');
    doc.fontSize(5);

    var width = doc.page.width;
    var height = doc.page.height;

    var imageWidth = (width-(options.margin*2)-((options['columns']-1)*options.innerMargin))/options['columns']
    var imageHeight = imageWidth*(1/aspectRatio.getAspectRatio());
    var moduleHeight = imageHeight+options.textHeight;

    if (options.printWorksheetLines) {
      moduleHeight = moduleHeight + ((options.worksheetLines-1)*15);
    }

    var rows = Math.floor((height-((options.margin+5)*2)-options.headerHeight)/moduleHeight);

    if (options.boardWorksheet) {
      data.splice(1);
      for (var i2 = 1; i2 < (options['columns']*rows); i2++) { 
        data.push({text: ""});
      }
    }

    if ( rows > 1 ) {
      var extra = ((((height-((options.margin+5)*2)-options.headerHeight)/moduleHeight) - rows) * moduleHeight) / (rows - 1);
      moduleHeight = moduleHeight + extra;
    }

    var lastImage = false;
    var page = 1;
    var pageCount = Math.ceil(data.length / (rows * options['columns']));

    var printDate = new Date();

    var drawHeader = function() {
      doc.fontSize(5);
      doc.text("WRITTEN BY: " + fountainManager.getAuthor().toUpperCase(), options.margin, 20, {width: 6*72, ellipsis: true, lineBreak: false, height: 5});
      doc.text("PAGE " + page + "/" + pageCount, width-options.margin-(2*72), 20, {width: 2*72, ellipsis: true, lineBreak: false, height: 5, align: 'right'});
      doc.text(printDate.toLocaleDateString(), width-options.margin-(2*72), 25, {width: 2*72, ellipsis: true, lineBreak: false, height: 5, align: 'right'});
      doc.fontSize(10);
      doc.moveUp(0);
      doc.fillOpacity(1);
      if (options.includeBeats) {
        doc.text("OUTLINE AND BEATS: " + fountainManager.getTitle() , options.margin, 25, {width: 6*72, ellipsis: true, continued: false, height: options.textHeight-(10)});
      } else {
        doc.text("OUTLINE: " + fountainManager.getTitle() , options.margin, 25, {width: 6*72, ellipsis: true, continued: false, height: options.textHeight-(10)});
      }
      doc.fontSize(3.5);
      doc.moveUp(0.2);
      doc.text("SCENES: " + scenes + "    BEATS: " + beats + "    RUNNING TIME: " + numberToTime(totalLength/1000) + "    EST. SHOTS: " + Math.floor(totalLength/1000/4) + "    EST. BOARDS: " + Math.floor(totalLength/1000/4*2) + "    BOARDS: " + boards + " [" + Math.floor(boards/Math.floor(totalLength/1000/4*2)*100) + "% DONE]", {width: 4*72, ellipsis: true, continued: false, height: 18});
      doc.fontSize(5);
    }

    var drawStartCap = function() {
      doc.lineWidth(1.5)
        .moveTo(xPoint + 2, yPoint)
        .lineTo(xPoint, yPoint)
        .lineTo(xPoint, yPoint+imageHeight)
        .lineTo(xPoint + 2, yPoint+imageHeight)
        .stroke();
    }

    var drawEndCap = function() {
      doc.lineWidth(1.5)
        .moveTo(xPoint + imageWidth - 2, yPoint)
        .lineTo(xPoint + imageWidth, yPoint)
        .lineTo(xPoint + imageWidth, yPoint+imageHeight)
        .lineTo(xPoint + imageWidth - 2, yPoint+imageHeight)
        .stroke();
    }


    if (options.printHeader) { drawHeader(); };

    var currentShot = 0;
    var currentBoard = 0;

    for (var i = 0; i < data.length; i++) { 
      var xCursor = i % options['columns'];
      var yCursor = Math.floor(i/options['columns']) % rows;
      var xPoint = options.margin+(xCursor*(imageWidth+options.innerMargin));
      var yPoint = options.margin+5+(yCursor*moduleHeight)+options.headerHeight;
      var multipleShots = false;
      if (options.printWorksheetLines) {
        doc.save();
        doc.lineWidth(0.1);
        for (var i2 = 0; i2 < options.worksheetLines; i2++) {
            doc.moveTo(xPoint, yPoint + imageHeight + options.textHeight + ((i2)*15) - 5)
              .lineTo(xPoint + imageWidth, yPoint + imageHeight + options.textHeight + ((i2)*15) - 5)
              .stroke();
        } 
        doc.restore();
      }
      if (data[i].image) {
        lastImage = data[i].image;
        if (!data[i].continued) {
          currentShot++;
          currentBoard = 0;
          if ((i+1) < data.length) {
            if (data[i+1].continued) {
              multipleShots = true;
            } else {
              multipleShots = false;
            }
          }
        } else {
          currentBoard++;
        }
        var shotLabel = "";
        if (multipleShots || data[i].continued) {
          if (!data[i].continued) {
            shotLabel = "SCENE " + currentShot + numberToLetter(currentBoard);
          } else {
            shotLabel = "BEAT " + currentShot + numberToLetter(currentBoard);
          }
        } else {
          shotLabel = "SCENE " + currentShot;
        }
        doc.fontSize(4);
        doc.text(shotLabel, xPoint, yPoint-7, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15, align: 'right'});
        doc.image(localSource.getFullDataPath() + '/images/' + data[i].image + '-large.jpeg', xPoint, yPoint, {width: imageWidth, height: imageHeight});
        
        if (!data[i].continued) {
          doc.strokeOpacity(1).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
        } else {
          doc.save();
          doc.strokeOpacity(1).dash(1, {space: 1}).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
          doc.restore();
        }


        if (!data[i].continued) {
          drawStartCap();
          doc.text(numberToTime(data[i].time/1000), xPoint, yPoint-7, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
          if ((i+2) <= data.length){
            if (!options.repeatEmptyBoards) {
              if (!data[i+1].continued) { 
                drawEndCap();
              }
            } else {
              if (data[i+1].image !== undefined && !data[i+1].continued) { 
                drawEndCap();
              }
            }
          } else {
            drawEndCap();
          }
        } else {
          if (!options.repeatEmptyBoards) {
            if ((i+1) < data.length) {
              if (!data[i+1].continued) { 
                drawEndCap();
              }  
            }
            
          } else {
            if (data[i+1].image !== undefined && !data[i+1].continued) { 
              drawEndCap();
            }
          }

          if ((i+1) == data.length ) {
            drawEndCap();
          }

        }
      } else {
        if (!data[i].continued) {
          currentShot++;
          currentBoard = 0;
        } else {
          currentBoard++;
        }
        if (lastImage) {
          if (options.repeatEmptyBoards) {
            doc.save();
            doc.fillOpacity(0.5);
            doc.image(localSource.getFullDataPath() + '/images/' + lastImage + '-large.jpeg', xPoint, yPoint, {width: imageWidth, height: imageHeight})
            doc.strokeOpacity(1).dash(1, {space: 1}).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
            doc.restore();            
            if ((i+2) <= data.length){
              if ((data[i+1].image !== undefined && !data[i+1].continued) ) { 
                drawEndCap();              
              }
            }        
          } else {
            doc.save();
            doc.strokeOpacity(1).dash(1, {space: 1}).lineWidth(0.2).rect(xPoint, yPoint, imageWidth, imageHeight).stroke();
            doc.restore();     
            if (options.drawGuides) {
              doc.save();
              doc.lineWidth(0.05)
                .dash(.2, {space: 1})
                .moveTo(xPoint + (imageWidth/3), yPoint)
                .lineTo(xPoint + (imageWidth/3), yPoint + imageHeight)
                .stroke()
                .moveTo(xPoint + (imageWidth/3*2), yPoint)
                .lineTo(xPoint + (imageWidth/3*2), yPoint + imageHeight)
                .stroke()
                .moveTo(xPoint, yPoint + (imageHeight/3))
                .lineTo(xPoint + imageWidth, yPoint + (imageHeight/3))
                .stroke()
                .moveTo(xPoint, yPoint + (imageHeight/3*2))
                .lineTo(xPoint + imageWidth, yPoint + (imageHeight/3*2))
                .stroke()
              doc.restore();
            }
          }
        }
      }

      if (!data[i].continued) {
        doc.fontSize(4);
        doc.text(data[i].slugline, xPoint, yPoint+imageHeight+2, {width: imageWidth, ellipsis: true, lineBreak: true, height: 5});
        doc.fontSize(6);
        doc.text(currentShot + ": " + data[i].title, {width: imageWidth, ellipsis: true, lineBreak: true, height: 5});
        doc.fontSize(5);
        doc.text(data[i].synopsis, {width: imageWidth, ellipsis: true, lineBreak: true, height: 30});
      } else  {
        doc.fontSize(4);
        doc.text(" ", xPoint, yPoint+imageHeight+2, {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
        doc.fontSize(6);
        doc.text(currentShot + numberToLetter(currentBoard) + ": " + (data[i].title).toUpperCase(), {width: imageWidth, ellipsis: true, lineBreak: true, height: 15});
        doc.fontSize(5);
        doc.text(data[i].synopsis, {width: imageWidth, ellipsis: true, lineBreak: true, height: 30});

      }

      if ((xCursor == (options['columns']-1)) && (yCursor == (rows-1)) && ((i+1) < data.length)) {
        doc.addPage();
        page++;
        if (options.printHeader) { drawHeader(); };
      }
    }
    doc.end();
    // stream.on('finish', function() {
    //   url = stream.toBlobURL('application/pdf');
    //   iframe.src = url;
    // });
  };

  var scriptPrint = function(options) {

    if (!options) {
      var options = {};
    }

    var DEFAULT_OPTIONS = {
      printHeader: true,
      printBoards: true,
      printElementLabels: true,
      leftMarginOffset: 0.3*72,
      topMargin: 1.25*72,
      monoFontSize: 11.4,
      lineGap: -0.10,
      lineNumberBreak: 53,
    };

    for (var k in DEFAULT_OPTIONS){
      if (!(k in options)) {
        options[k] = DEFAULT_OPTIONS[k]
      }
    }

    var doc = new PDFDocument({margins: {top: 0, bottom: 0, left: 1.5*72, right: 1*72}, layout: 'portrait', size: 'LETTER'});
    doc.pipe(fs.createWriteStream('output.pdf'))
    //var stream = doc.pipe(blobStream());
    doc.registerFont('sans', 'fonts/p.ttf');
    doc.registerFont('mono', 'fonts/Courier-Prime.ttf');

    var printDate = new Date();

    var atoms = fountainManager.getAtoms();
    var titlePage = true;
    var currentPage = 0;
    var currentScene = 0;
    var currentElement = 0;
    var currentCharacter = "";
    var continuedCharacter = "";
    var monoFontSize = options.monoFontSize;
    doc.fontSize(monoFontSize);
    doc.font('mono');

    var lineGap = options.lineGap;
    var spaceWidth = doc.widthOfString(" ") 
    var spaceHeight = doc.heightOfString(" ", {lineGap: lineGap}); 

    var topMargin = options.topMargin;
    var leftMarginOffset = options.leftMarginOffset;
    var currentY = topMargin;

    var lineNumberBreak = options.lineNumberBreak;

    var printChunk = [];

    var breakOutOfTitlePage = function() {
      if (titlePage) { 
        titlePage = false;
        addPage();
      }
    }

    var addPage = function() {
      doc.addPage();
      currentPage++;
      if (currentPage > 0) {
        doc.text(currentPage + ".", 7.4*72, 0.6*72);
      }
      currentY = topMargin;
      drawHeader();
    }

    var headerInfo = {};

    var generateHeaderInfo = function() {
      var data = [];
      var chunks = fountainManager.getAtoms();
      var scene = 0;
      var lineNumber = 0;
      var elements = 0;
      var lines = 0;
      var shots = 0;

      var scenes = 0;
      var beats = 0;
      var totalLength = 0;
      var boards = 0;

      var outlineData = {};
      var sceneStartTime = 0;

      var beat = {type: 'beat', continued: true};

      // parse the data
      for (var i = 0; i < chunks.length; i++) { 
        if (chunks[i].type == "scene_heading") {
          var outlineItem = fountainManager.getOutlineItem(scene);
          if (chunks[i+1].file) {
            var image = chunks[i+1].file;
          } else {
            var image = false;
          }
          data.push({slugline: outlineItem.slugline, synopsis: outlineItem.synopsis, title: outlineItem.title, image: image, time: outlineItem.time});
          scenes++;
          beats++;
          scene++;
          totalLength = Math.max(outlineItem.time + outlineItem.duration);
        } else {
          if (chunks[i].type == "section" && chunks[i].depth == 4) {
            beat["title"] = chunks[i].text;
            beat["synopsis"] = "";
          }
          if (chunks[i].type == "synopsis") {
            beat["synopsis"] = chunks[i].text;
          }
          if (beat["title"] && chunks[i].type == "image") {
            beat["image"] = chunks[i].file;
            data.push(beat);
            beat = beat = {type: 'beat', continued: true};
            beats++;
          }

          if (chunks[i].type == "image") {
            boards++;
          }
        }
      }
      headerInfo = {scenes: scenes, beats: beats, totalLength: totalLength, boards: boards};
    };

    generateHeaderInfo();

    var drawHeader = function() {
      if (options.printHeader) {
        doc.font('sans');
        doc.fontSize(3.5);
        doc.text("WRITTEN BY: " + fountainManager.getAuthor().toUpperCase(), 0.4*72, 20, {width: 6*72, ellipsis: true, lineBreak: false, height: 5});
        doc.text(printDate.toLocaleDateString(), 6*72, 20, {width: 2*72, ellipsis: true, lineBreak: false, height: 5, align: 'right'});
        doc.fontSize(10);
        doc.moveUp(0);
        doc.fillOpacity(1);
        doc.text(fountainManager.getTitle() , 0.4*72, 24, {width: 6*72, ellipsis: true, continued: false});
        doc.fontSize(3.5);
        doc.moveUp(0.2);
        doc.text("SCENES: " + headerInfo.scenes + "    BEATS: " + headerInfo.beats + "    RUNNING TIME: " + numberToTime(headerInfo.totalLength/1000) + "    EST. SHOTS: " + Math.floor(headerInfo.totalLength/1000/4) + "    EST. BOARDS: " + Math.floor(headerInfo.totalLength/1000/4*2) + "    BOARDS: " + headerInfo.boards + " [" + Math.floor(headerInfo.boards/Math.floor(headerInfo.totalLength/1000/4*2)*100) + "% DONE]", {width: 4*72, ellipsis: true, continued: false, height: 18});
        doc.fontSize(5);
        doc.font('mono');
        doc.fontSize(monoFontSize);
      }
    };

    drawHeader();

    var addLineSpacing = function(lines) {
      if (currentY-topMargin == 0) {
        // no leading spaces
      } else {
        if (!lines) {
          doc.text(" ", 1.5*72, currentY, {width: 0.5*72, lineBreak: true, lineGap: lineGap, align: 'right'});
          currentY = Number(doc.y);
        } else {
          for (var i7 = 0; i7 < lines; i7++) {
            doc.text(" ", 1.5*72, currentY, {width: 0.5*72, lineBreak: true, lineGap: lineGap, align: 'right'});
            currentY = Number(doc.y);
          }           
        }
      }
    };

    var renderElementLabel = function() {
      if (options.printElementLabels) {
        doc.font('sans');
        doc.fontSize(3);
        doc.text(currentScene + "." + currentElement + " ", leftMarginOffset+0.90*72, currentY+5, {width: 0.5*72, lineBreak: true, lineGap: lineGap, align: 'right'});
        doc.font('mono');
        doc.fontSize(monoFontSize);
      }
    };

    var renderSceneBoard = function(sceneNumber) {
      if (options.printBoards) {
        var data = [];
        var chunks = fountainManager.getScriptChunks()
        var scene = 0;
        var lineNumber = 0;
        var boards = 0;
        var elements = 0;
        var lines = 0;
        var shots = 0;

        var outlineData = {};
        var sceneStartTime = 0;
        var sceneFile;

        // parse the data
        for (var i = 0; i < chunks.length; i++) { 
          if (chunks[i].type == "scene_heading") {
            scene++;
            var outlineItem = fountainManager.getOutlineItem(sceneNumber-1);
            outlineData = {slugline: outlineItem.slugline, synopsis: outlineItem.synopsis, title: outlineItem.title, sceneNumber: sceneNumber, duration: outlineItem.duration, time: outlineItem.time};
          } else {
            if (scene == sceneNumber) {
              sceneStartTime = Math.min(chunks[i].time, sceneStartTime);
              elements++;
              var element = {elements: elements, text: chunks[i].text}
              if (chunks[i].images) {
                element.image = chunks[i].images[0][0].file
                if (!sceneFile) { sceneFile = chunks[i].images[0][0].file; }
                if (chunks[i].images[0][0].continued) {
                  element.continued = 1;
                }
              }
              if (chunks[i].character) {
                lines++;
                element.character = chunks[i].character;
              }
              data.push(element);
              if (chunks[i].images) {
                boards++;
                if (chunks[i].images.length > 1) {
                  for (var i2 = 1; i2 < chunks[i].images.length; i2++) { 
                    boards++;
                    if (chunks[i].images[i2][0].continued) {
                      data.push({image: chunks[i].images[i2][0].file, continued: 1});
                    } else {
                      shots++;
                      data.push({image: chunks[i].images[i2][0].file});
                    }
                  }
                  element.connected = 1;
                }
              }
            }          
          }
        }
        var width = 1.1*72;
        var height = width*(1/aspectRatio.getAspectRatio());
        if (sceneFile) {
          doc.image(localSource.getFullDataPath() + '/images/' + sceneFile + '-large.jpeg', 0.4*72, currentY, {width: width, height: height});
        }
        doc.strokeOpacity(1).lineWidth(0.2).rect(0.4*72, currentY, width, height).stroke();
        doc.font('sans');
        doc.fontSize(5);
        doc.text(numberToTime(outlineData.time/1000) + " [" + numberToTime(outlineData.duration/1000) + "]", 0.4*72, currentY-8, {width: width, lineBreak: true, lineGap: lineGap, align: 'left'});
        doc.fontSize(6);
        doc.text(sceneNumber + ": " + outlineData.title, 0.4*72, currentY+2+ height, {width: width, lineBreak: true, lineGap: lineGap, align: 'left'});
        doc.fontSize(5);
        doc.text("EST. SHOTS: " + Math.floor(outlineData.duration/1000/4), 0.4*72, Number(doc.y), {width: width, lineBreak: true, lineGap: lineGap, align: 'left'});
        doc.text("EST. BOARDS: " + Math.floor(outlineData.duration/1000/4*2), 0.4*72, Number(doc.y), {width: width, lineBreak: true, lineGap: lineGap, align: 'left'});
        doc.text("BOARDS: " + boards + " [" + Math.min(Math.floor((boards/Math.floor(outlineData.duration/1000/4*2))*100),100) + "% DONE]", 0.4*72, Number(doc.y), {width: width, lineBreak: true, lineGap: lineGap, align: 'left'});
        doc.font('mono');
        doc.fontSize(monoFontSize);
      }
    };

    var printChunks = function() {
      // loop through and calculate
      var height = 0;
      for (var i3 = 0; i3 < printChunk.length; i3++) {
        switch (printChunk[i3].type) {
          case 'character':
            height = height + spaceHeight;
            break;
          case 'parenthetical':
          case 'centered':
            var text = fountainHelpers.htmlToMarkup(printChunk[i3].text.replace(/(<br \/>)+/g, "\n").trim());
            height = height + doc.heightOfString(text, 3*72, Number(doc.y), {width: 2.5*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
            break;
          case 'dialogue':
            var text = fountainHelpers.htmlToMarkup(printChunk[i3].text.replace(/(<br \/>)+/g, "\n").trim());
            var height = height + doc.heightOfString(text, 2.5*72, Number(doc.y), {width: 3.2*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
            break;
          case 'scene_heading':
            height = height + doc.heightOfString(printChunk[i3].text, 1.5*72, Number(doc.y), {width: 6*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            break;
          case 'action':
            var text = fountainHelpers.htmlToMarkup(printChunk[i3].text.replace(/(<br \/>)+/g, "\n").trim());
            height = height + doc.heightOfString(text, 1.5*72, Number(doc.y), {width: 6*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            break;
          case 'transition':
            var text = printChunk[i3].text;
            height = height + doc.heightOfString(text, 6.5*72, Number(doc.y), {width: 1*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            break;
        }
      }
      // if height puts it over the edge, break page
      if (Math.ceil((currentY-spaceHeight-topMargin+height)/spaceHeight) > lineNumberBreak) {
        if (printChunk[printChunk.length-1].type == 'dialogue' && printChunk[0].type !== 'character') {
          doc.text("(MORE)", leftMarginOffset+3.5*72, currentY, {width: 2.5*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
        }
        addPage();
        if (printChunk[printChunk.length-1].type == 'dialogue' && printChunk[0].type !== 'character') {
          printChunk.unshift({type: 'character', character: printChunk[0].character + " (CONT'D)"})
        }
      }      
      // draw, reset pintchunk
      for (var i = 0; i < printChunk.length; i++) {
        switch (printChunk[i].type) {
          case 'character':
            doc.text(printChunk[i].character, leftMarginOffset+3.5*72, currentY, {lineGap: lineGap});
            currentY = Number(doc.y);
            continuedCharacter = currentCharacter;
            break;
          case 'parenthetical':
            var text = fountainHelpers.htmlToMarkup(printChunk[i].text.replace(/(<br \/>)+/g, "\n").trim());
            doc.text(text, leftMarginOffset+3*72, currentY, {width: 2.5*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
          case 'centered':
            addLineSpacing(2);
            var text = fountainHelpers.htmlToMarkup(printChunk[i].text.replace(/(<br \/>)+/g, "\n").trim());
            doc.text(text, leftMarginOffset+3*72, currentY, {width: 2.5*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
          case 'dialogue':
            currentElement++;
            renderElementLabel();
            var text = fountainHelpers.htmlToMarkup(printChunk[i].text.replace(/(<br \/>)+/g, "\n").trim());
            doc.text(text, leftMarginOffset+2.5*72, currentY, {width: 3.2*72+ spaceWidth+2, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
          case 'scene_heading':
            currentScene++;
            currentElement = 0;
            addLineSpacing(2);
            renderElementLabel();
            renderSceneBoard(currentScene);
            doc.text(printChunk[i].text, leftMarginOffset+1.5*72, currentY, {width: 6*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
          case 'action':
            currentElement++;
            addLineSpacing(1);
            renderElementLabel();
            var text = fountainHelpers.htmlToMarkup(printChunk[i].text.replace(/(<br \/>)+/g, "\n").trim());
            doc.text(text, leftMarginOffset+1.5*72, currentY, {width: 6*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
          case 'transition':
            addLineSpacing(1);
            var text = printChunk[i].text;
            doc.text(text, leftMarginOffset+6.5*72, currentY, {width: 1*72+ spaceWidth+1, lineBreak: true, lineGap: lineGap});
            currentY = Number(doc.y);
            break;
        }
      }
      printChunk = [];
    };

    for (var i = 0; i < atoms.length; i++) {
      switch (atoms[i].type) {
        case 'title':
        case 'credit':
        case 'author':
        case 'source':
        case 'draft_date':
        case 'contact':
          break;
        case 'scene_heading':
          breakOutOfTitlePage();
          currentCharacter = "";
          continuedCharacter = "";
          printChunk.push(atoms[i]);
          break;
        case 'action':
          breakOutOfTitlePage();
          currentCharacter = "";
          printChunk.push(atoms[i]);
          printChunks();
          break;
        case 'parenthetical':
          breakOutOfTitlePage();
          if (currentCharacter !== atoms[i].character) {
            currentCharacter = atoms[i].character;
            addLineSpacing(1);
            if (continuedCharacter == currentCharacter) {
              printChunk.push({type: 'character', character: atoms[i].character + " (CONT'D)"});
            } else {
              printChunk.push({type: 'character', character: atoms[i].character});
            }
          }
          printChunk.push(atoms[i]);
          break;
        case 'dialogue':
          // figure out dual dialogue
          breakOutOfTitlePage();
          if (currentCharacter !== atoms[i].character) {
            currentCharacter = atoms[i].character;
            addLineSpacing(1);
            if (continuedCharacter == currentCharacter) {
              printChunk.push({type: 'character', character: atoms[i].character + " (CONT'D)"});
            } else {
              printChunk.push({type: 'character', character: atoms[i].character});
            }
          }
          printChunk.push(atoms[i]);
          printChunks();
          break;
        case 'centered': 
          breakOutOfTitlePage();
          currentCharacter = "";
          printChunk.push(atoms[i]);
          printChunks();
          break;
        case 'transition': 
          breakOutOfTitlePage();
          currentCharacter = "";
          printChunk.push(atoms[i]);
          printChunks();
          break;
        // case 'section':
        //   if (titlePage) { 
        //     titlePage = false;
        //     scriptText.push('');
        //   }
        //   switch (script[i].depth) {
        //     case 1:
        //       scriptText.push('# ' + script[i].text);
        //       break;
        //     case 2: 
        //       scriptText.push('## ' + script[i].text);
        //       break;
        //     case 3: 
        //       scriptText.push('### ' + script[i].text);
        //       break;
        //     case 4: 
        //       scriptText.push('#### ' + script[i].text);
        //       break;
        //     case 5: 
        //       scriptText.push('##### ' + script[i].text);
        //       break;
 

        //   }
        //   scriptText.push('');
        //   break;
        // case 'synopsis':
        //   if (titlePage) { 
        //     titlePage = false;
        //     scriptText.push('');
        //   }
        //   scriptText.push('= ' + script[i].text);
        //   scriptText.push('');
        //   break;
        // case 'note':
        //   if (titlePage) { 
        //     titlePage = false;
        //     scriptText.push('');
        //   }
        //   if (script[i].settings) {
        //     insertSettings();
        //   }
        //   else {
        //     scriptText.push('[[' + script[i].text + ']]');
        //   }
        //   scriptText.push('');
        //   break;
        // case 'image':
        //   if (titlePage) { 
        //     titlePage = false;
        //     scriptText.push('');
        //   }
        //   var duration = '';
        //   if (!atom.durationIsCalculated) {
        //     duration = ', duration: ' + (atom.duration / 1000).toFixed(2);
        //   }
        //   var continued = '';
        //   if (atom.continued) {
        //     continued = ', continued: true';
        //   }

        //   scriptText.push('[[board: ' + script[i].file + duration + continued + ']]');
        //   scriptText.push('');
        //   break;
      }
    }    
    doc.end();
  };

  var numberToLetter = function(number) {
    var letters = "abcdefghijklmnopqrstuvwxyz".split('');
    return (letters[number % (letters.length)]).toUpperCase();
  };

  var numberToTime = function(number) {
    var mins = Math.floor(number/60);
    var secs = Math.floor(number-(mins*60));
    return (pad(mins, 2) + ":" + pad(secs, 2));
  };

  var pad = function (n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  };
  
  var printManager = window.printManager = {
    outlinePrint: outlinePrint,
    scenePrint: scenePrint,
    scriptPrint: scriptPrint,
  };

}).call(this);