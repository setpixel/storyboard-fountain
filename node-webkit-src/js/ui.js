;(function() {
  'use strict';

  var events = require('events');
  var path = require('path');
  var _ = require('underscore');

  var emitter = new events.EventEmitter();
  var editor = null;
  var activeState = 'boards';

  var editorWidths = {};

  var titleSuggestion = function() {
    var title = fountainManager.getTitle() || '';
    title = title.toLowerCase().replace(/\s+/g, '_').replace(/[^_a-z0-9]/g, '');
    if (title.length) {
      return title;
    }
    else {
      return 'script';
    }
  };

  // kinda a hack to make sure the script editor has flushed any changes before
  // we attempt to save
  var flushScript = function(next) {
    if (activeState == 'script') {
      scriptEditor.flushChanges(next);
    }
    else {
      next();
    }
  };

  var askSave = function(next) {
    if (currentFile.hasSaved()) {
      currentFile.save(function(err) {
        if (next) next(err);
      });
    }
    else {
      if (confirm('You haven\'t saved this script yet. Press OK to save first.')) {
        var chooser = $('#save-file-input');
        chooser.attr('nwsaveas', titleSuggestion() + '.fountain');
        chooser.change(function(evt) {
          evt.preventDefault();
          evt.stopPropagation();
          evt.stopImmediatePropagation();
          var fullpath = $(this).val();
          if (!fullpath) return;
          if (path.extname(fullpath) == '') fullpath = fullpath + '.fountain'
          var config = {type: 'local', scriptPath: fullpath};
          currentFile.saveAs(config, function(err) {
            if (next) next(err);
          });
        });
        chooser.trigger('click');
      }
      else {
        if (next) next();
      }
    }
  };

  var save = function(next) {
    if (currentFile.hasSaved()) {
      currentFile.save(function(err) {
        if (next) next(err);
      });
    }
    else {
      var chooser = $('#save-file-input');
      chooser.attr('nwsaveas', titleSuggestion() + '.fountain');
      chooser.change(function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        var fullpath = $(this).val();
        if (!fullpath) return;
        if (path.extname(fullpath) == '') fullpath = fullpath + '.fountain'
        var config = {type: 'local', scriptPath: fullpath};
        currentFile.saveAs(config, function(err) {
          if (next) next(err);
        });
      });
      chooser.trigger('click');
    }
  };

  var setActiveState = function(state) {
    activeState = state;
    emitter.emit('activeState:change', activeState);
  };

  var resizeView = function() {
    if (sketchpane.getPenDown()) return;

    var toolbarHeight = 50;
    var timelineHeight = 0;
    var boardslistWidth = 400;
    var captionHeight = 50;
    var canvasSidePadding = 40;

    var windowWidth = $(window).width();
    var windowHeight = $(window).height();

    var canvasDim = [windowWidth-boardslistWidth, windowHeight-toolbarHeight-timelineHeight];

    $(".drawing-canvas").css('width', canvasDim[0]);
    $(".drawing-canvas").css('height', canvasDim[1]);

    $(".drawing-canvas .caption").css('height', captionHeight);

    $(".boards-list").css('height', canvasDim[1]);

    if (((canvasDim[0]-(canvasSidePadding*2))/(canvasDim[1]-(canvasSidePadding*2)-captionHeight)) >= aspectRatio.getAspectRatio()) {
      var canvasHeight = (canvasDim[1]-(canvasSidePadding*2)-captionHeight);
      var canvasWidth = (canvasDim[1]-(canvasSidePadding*2)-captionHeight) * aspectRatio.getAspectRatio();
      $(".drawing-canvas .canvas, .drawing-canvas img").css('width', canvasWidth);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('height', canvasHeight);

      $(".drawing-canvas .canvas, .drawing-canvas img").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2));

      $(".drawing-canvas .caption").css('left', ((canvasDim[0] - canvasWidth)/2));
      $(".drawing-canvas .caption").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight);
      $(".drawing-canvas .caption").css('width', canvasWidth);
    } else {
      var canvasHeight = (windowWidth-boardslistWidth-(canvasSidePadding*2))/aspectRatio.getAspectRatio();
      var canvasWidth = windowWidth-boardslistWidth-(canvasSidePadding*2);

      $(".drawing-canvas .canvas, .drawing-canvas img").css('width', canvasWidth);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('height', canvasHeight);

      $(".drawing-canvas .canvas, .drawing-canvas img").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2));

      $(".drawing-canvas .caption").css('left', ((canvasDim[0] - canvasWidth)/2));
      $(".drawing-canvas .caption").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight);
      $(".drawing-canvas .caption").css('width', canvasWidth);
    }

    var scriptHeight = windowHeight - toolbarHeight - $('.tabs').outerHeight();
    $('#nano-script').css('height', scriptHeight + 'px');

    $("#scripttext").css('width', canvasDim[0]);
    window.editor.setSize(canvasDim[0],canvasDim[1])


    var canvasWidth = (canvasDim[0] - (canvasSidePadding * 2));
    //$("#scripttext").css('width', canvasWidth + 'px');

    // var calcEditorWidth = function(size) {
    //   if (editorWidths[size]) {
    //     return editorWidths[size];
    //   }
    //   $('#scripttext .CodeMirror').css('font-size', size + 'px');
    //   var w = $('.CodeMirror').width();
    //   editorWidths[size] = w;
    //   return w;
    // }
    var editorWidth = 500; //calcEditorWidth();
    var editorSpace = canvasDim[0] - canvasSidePadding * 2 - 20 * 2;
    var size = 18;
    // while (calcEditorWidth(size) > editorSpace && size > 1) {
    //   size -= 1;
    // }
    // $('#scripttext .CodeMirror').css('font-size', size + 'px');

    window.scrollTo(0);
  }

  var scrollToTop = function () {
    window.scrollTo(0);
  }

  var confirmExit = function() {
    if (storyboardState.getDirty()) {
      window.setTimeout(storyboardState.forceSave, 1000);
      return "Not finished saving yet. Are you sure?";
    }
  };

  $(document).ready(function() {

    resizeView();
    

    recorder.emitter.on('state:change', function(state) {
      if (state == 'recording') {
        $('.disable-while-engaged').addClass('disabled')
        $('#bttn-play, #bttn-pause').addClass('disabled')
        $('#tab-script, #tab-scripttext').addClass('disabled')
        $('.drawing-canvas').addClass('disabled')
        $('.timer-duration').addClass('disabled')
      }
      else {
        $('.disable-while-engaged').removeClass('disabled')
        $('#bttn-play, #bttn-pause').removeClass('disabled')
        $('#tab-script, #tab-scripttext').removeClass('disabled')
        $('.drawing-canvas').removeClass('disabled')
        $('.timer-duration').removeClass('disabled')
      }
    });

    player.emitter.on('state:change', function(state) {
      if (state == 'playing') {
        $('.disable-while-engaged').addClass('disabled')
        $('#bttn-record, #bttn-recording').addClass('disabled')
        $('#tab-script, #tab-scripttext').addClass('disabled')
        $('.drawing-canvas').addClass('disabled')
        $('.timer-duration').addClass('disabled')
      }
      else {
        $('.disable-while-engaged').removeClass('disabled')
        $('#bttn-record, #bttn-recording').removeClass('disabled')
        $('#tab-script, #tab-scripttext').removeClass('disabled')
        $('.drawing-canvas').removeClass('disabled')
        $('.timer-duration').removeClass('disabled')
      }
    });

    var checkDisabled = function(fn) {
      return function(e) {
        if ($(this).hasClass('disabled')) {
          return false;
        }
        else {
          return fn(e);
        }
      };
    }

    $('.tab').click(function(){
      $(this).parent().children().removeClass('selected');
      $(this).addClass('selected');
    })

    $('#tab-script').click(checkDisabled(function(){
      $('#scripttext').css('display', 'none');
      $('#drawpane').show();
      $('#boards-toolbar').show();
      $('#script-toolbar').hide();
      setActiveState('boards');
    }));

    $('#tab-scripttext').click(checkDisabled(function() {
      $('#scripttext').css('display', 'inline-block');
      $('#drawpane').hide();
      $('#boards-toolbar').hide();
      $('#script-toolbar').show();
      setActiveState('script');
    }));

    $(window).resize(resizeView);
    $(window).resize(fountainManager.renderScenes);



    window.onbeforeunload = confirmExit;

    $('#bttn-stats').click(function() {
      showStats();
    });

    $('#bttn-auto-indent').click(function() {
      scriptEditor.toggleAutoIndent();
    });

    scriptEditor.emitter.on('autoIndent:change', function(value) {
      $('#bttn-auto-indent').toggleClass('selected', value);
    });

    $('#bttn-expand-notes').click(function() {
      scriptEditor.toggleExpandNotes();
    });

    scriptEditor.emitter.on('expandNotes:change', function(value) {
      $('#bttn-expand-notes').toggleClass('selected', value);
    });

    // kidna a hack but need to force the UI to update for now
    scriptEditor.toggleAutoIndent(scriptEditor.getAutoIndent());
    scriptEditor.toggleExpandNotes(scriptEditor.getExpandNotes());

    $('#bttn-play').click(checkDisabled(player.play));
    $('#bttn-pause').click(checkDisabled(player.pause));

    player.emitter.on('state:change', function(state) {
      $('#bttn-play')[state == 'playing' ? 'hide' : 'show']();
      $('#bttn-pause')[state == 'paused' ? 'hide' : 'show']();
    });

    $('#bttn-record').click(checkDisabled(recorder.startRecording));
    $('#bttn-recording').click(checkDisabled(recorder.stopRecording));

    recorder.emitter.on('state:change', function(state) {
      $('#bttn-record')[state == 'recording' ? 'hide' : 'show']();
      $('#bttn-recording')[state == 'paused' ? 'hide' : 'show']();
    });

    $("#bttn-new-board").click(checkDisabled(fountainManager.newBoard));
    $("#bttn-remove-board").click(checkDisabled(fountainManager.deleteBoard));

    $("#bttn-previous").click(checkDisabled(function() {fountainManager.goNext(-1);}));
    $("#bttn-next").click(checkDisabled(function() {fountainManager.goNext(1);}));

    $("#bttn-undo").click(checkDisabled(sketchpane.undo));
    $("#bttn-redo").click(checkDisabled(sketchpane.redo));

    $("#bttn-copy").click(checkDisabled(function() { document.execCommand('copy'); }));
    $("#bttn-paste").click(checkDisabled(function() { document.execCommand('paste'); }));

    $("#bttn-lightbox").click(checkDisabled(sketchpane.toggleLightboxMode));

    sketchpane.emitter.on('lightboxmode:change', function(mode) {
      $("#bttn-lightbox").toggleClass('selected', mode);
    });

    var penButtons = [
      {selector: '#bttn-paint', fn: function() {
        sketchpane.setLayer(0);
        sketchpane.setBrush({size: 20, opacity: 15});
      }},
      {selector: '#bttn-pencil', fn: function() {
        sketchpane.setLayer(1);
        sketchpane.setBrush({size: 1, opacity: 0});
      }},
      {selector: '#bttn-pen', fn: function() {
        sketchpane.setLayer(2);
        sketchpane.setBrush({size: 4, opacity: 60});
      }}
    ];

    $.each(penButtons, function(layer, data) {
      $(data.selector).click(checkDisabled(data.fn));
    });

    sketchpane.emitter.on('layer:change', function(newLayer, oldLayer) {
      $(penButtons[oldLayer].selector).removeClass('selected');
      $(penButtons[newLayer].selector).addClass('selected');
    });

    var colorButtons = {
      '#bttn-color-1': [206,201,255],
      '#bttn-color-2': [221,218,255],
      '#bttn-color-3': [241,239,255],
      '#bttn-color-4': [0,0,0],
      '#bttn-color-5': [152,152,152],
      '#bttn-color-6': [188,188,188],
      '#bttn-color-7': [228,228,228],
      '#bttn-color-8': [255,255,255],
      '#bttn-color-9': [255,92,92],
      '#bttn-color-10': [132,198,121],
      '#bttn-color-11': [85,77,184]
    };

    $.each(colorButtons, function(selector, color) {
      $(selector).click(checkDisabled(function() { sketchpane.setColor(color) }));
    });

    var colorEquals = function(a, b) {
      return a[0] == b[0] && a[1] == b[1] && a[2] == b[2];
    };

    sketchpane.emitter.on('color:change', function(newColor, oldColor) {
      $.each(colorButtons, function(selector, color) {
        if (colorEquals(newColor, color)) {
          $(selector).addClass('selected');
        }
        else if (colorEquals(oldColor, color)) {
          $(selector).removeClass('selected');
        }
      });
    });

    $(window).keyup(function(e) {
      if (activeState == 'boards') {
        if (recorder.getState() == 'recording') {
          switch (e.keyCode) {
            case 27:  // esc
              recorder.stopRecording();
              break;
          }
        }
      }
    });

    var boardsKeyHandler = function(e) {
      // board editor
      switch (e.keyCode) {
        // shade
        case 49:  // 1
          sketchpane.setLayer(0);
          sketchpane.setBrush({size: 20, opacity: 15});
          break;
        // pencil
        case 50:  // 2
          sketchpane.setLayer(1);
          sketchpane.setBrush({size: 1, opacity: 0});
          break;
        // pen
        case 51:  // 3
          sketchpane.setLayer(2);
          sketchpane.setBrush({size: 4, opacity: 60});
          break;
        case 55:  // 7
        case 103:  // #7
          sketchpane.setColor([0,0,0]);
          break;
        case 56:  // 8
        case 104:  // #8
          sketchpane.setColor([188,188,188]);
          break;
        case 57:  // 9
        case 105:  // #9
          sketchpane.setColor([255,255,255]);
          break;
        case 52:  // 4
        case 100:  // #4
          sketchpane.setColor([255,92,92]);
          break;
        case 53:  // 5
        case 101:  // #5
          sketchpane.setColor([132,198,121]);
          break;
        case 54:  // 6
        case 102:  // #6
          sketchpane.setColor([85,77,184]);
          break;
        case 90:  // z
          sketchpane.undo();
          break;
        case 88:  // x
          sketchpane.redo();
          break;
        // n
        case 78:
          fountainManager.newBoard();
          break;
        // up and back
        case 37:  // left
        case 38:  // up
          e.preventDefault();
          fountainManager.goNext(-1);
          break;
        // next and forward
        case 39:  // right
        case 40:  // down
          e.preventDefault();
          fountainManager.goNext(1);
          break;
        case 67:  // c
          //document.execCommand('copy');
          break;
        case 86:  // v
          //document.execCommand('paste');
          break;
        case 76:  // l
          sketchpane.toggleLightboxMode();
          break;
        case 46:  // delete
          fountainManager.deleteBoard();
          break;
        case 32:  // space
          e.preventDefault();
          player.toggleState();
          break;
        case 82:  // r
          if (e.metaKey) {  // cmd + r
            recorder.startRecording();
          }
          break;
        case 33:  // page up
          e.preventDefault();
          fountainManager.nextScene(-1);
          break;
        case 34:  // page down
          e.preventDefault();
          fountainManager.nextScene(1);
          break;
        case 13:  // enter
          e.preventDefault();
          boardEditor.startEditing();
          break;
      }
    };

    var playerKeyHandler = function(e) {
      switch (e.keyCode) {
        case 32:  // space
          e.preventDefault();
          player.toggleState();
          break;
      }
    }

    var recorderKeyHandler = function(e) {
      switch (e.keyCode) {
        case 13:  // enter
        case 32:  // space
        case 39:  // right
        case 40:  // down
          e.preventDefault();
          recorder.advance();
          break;
        case 82:  // r
          if (e.metaKey) {  // cmd + r
            recorder.stopRecording();
          }
          break;
      }          
    }

    var scriptKeyHandler = function(e) {
      // script editor
      switch (e.keyCode) {
        case 69:  // e
          if (e.metaKey) {  // cmd + e
            scriptEditor.toggleExpandNotes();
          }
          break;
        case 68:  // d
          if (e.metaKey) {  // cmd + d
            scriptEditor.toggleAutoIndent();
          }
          break;
      }
    };

    var globalKeyHandler = function(e) {
      if (e.metaKey && e.altKey && e.keyCode == 73) {  // cmd + opt + i
        require('nw.gui').Window.get().showDevTools();
      }
    };

    var editorKeyHandler = function(e) {
      switch (e.keyCode) {
        case 83:  // s
          if (e.metaKey) {  // cmd + s
            flushScript(save);
          }
          break;
      }
    };

    $(window).keydown(function(e){

      globalKeyHandler(e);

      if (recorder.getState() == 'paused' && player.getFullState().state == 'paused') {
        editorKeyHandler(e);
      }

      if (activeState == 'boards') {
        if (elementEditor.isEditing()) {
          // handled by CodeMirror instance
        }
        else if (boardEditor.isEditing()) {
          // handled by CodeMirror instance
        }
        else if (recorder.getState() == 'paused') {
          if (player.getFullState().state == 'paused') {
            boardsKeyHandler(e);
          }
          else {
            playerKeyHandler(e);
          }
        }
        else {
          recorderKeyHandler(e);
        }
      }
      else {
        scriptKeyHandler(e);
      }
    });
  });

  $(document).ready(function() {

    timer.init($('.timer-timeleft'), $('.timer-duration div'));
    $('.timer-duration').click(function() {
      if (player.getFullState().state == 'playing' || recorder.getState() == 'recording') return;
      var atom = fountainManager.getAtomForCursor();
      if (!atom) return;
      var sec = (atom.duration / 1000).toFixed(1);
      var duration = prompt('Duration of this ' + atom.type, sec);
      if (duration === null) {
        return;
      }
      else if (parseFloat(duration) > 0) {
        fountainManager.setAtomDuration(atom, parseFloat(duration) * 1000);
        timer.setDuration(atom.duration);
        timer.setTimeLeft(atom.duration * 0.75);
      }
      else {
        return;
      }
    });
    var draggingDuration = false;
    $('.timer-duration').mousedown(function(e) {
      if (player.getFullState().state == 'playing' || recorder.getState() == 'recording') return;
      var atom = fountainManager.getAtomForCursor();
      if (!atom) return;

      var startX = e.pageX;
      var startDuration = atom.duration;
      var duration = startDuration;
      var moveHandler = function(e) {
        var diff = e.pageX - startX;
        duration = Math.floor(Math.max(100, startDuration + diff * 20));
        timer.setDuration(duration);
        timer.setTimeLeft(duration * 0.75);
      };
      var upHandler = function(e) {
        if (startX - e.pageX) {
          e.preventDefault();
          fountainManager.setAtomDuration(atom, duration);
        }
        $(window).unbind('mousemove', moveHandler);
        $(window).unbind('mouseup', upHandler);
      };
      $(window).mousemove(moveHandler);
      $(window).mouseup(upHandler);
    });
    fountainManager.emitter.on('selection:change', function(chunkIndex, boardIndex) {
      //console.log('fountaManager selection:change', chunkIndex, boardIndex);
      var atom = fountainManager.getAtomForCursor(chunkIndex, boardIndex);
      if (!atom) return;
      var update = timeline.getUpdateForAtom(atom);
      if (!update) return;
      timer.setDuration(update.duration);

      var playerState = player.getFullState();
      if (playerState.state == 'playing') {
        timer.setTimeLeft(playerState.updateTimeLeft);
        timer.play();
      }
      else {
        timer.setTimeLeft(update.duration * 0.75);
        timer.pause();
      }
    });
    player.emitter.on('state:change', function(state) {
      if (state == 'paused') {
        var playerState = player.getFullState();
        var update = timeline.updates()[playerState.updateIndex];
        timer.setTimeLeft(update.duration * 0.75);
        timer.pause();
      }
    });

    function _updateAspectRatio(ratio, oldRatio) {
      var classnames = {
        2.35: "aspect-ratio-2-35",
        1.85: "aspect-ratio-1-85",
        1.78: "aspect-ratio-1-78",
        1.33: "aspect-ratio-1-33"
      };
      if (oldRatio) {
        $('.boards-list').removeClass(classnames[oldRatio]);
      }
      $('.boards-list').addClass(classnames[ratio]);
    }
    aspectRatio.emitter.on('aspectRatio:change', _updateAspectRatio);
    _updateAspectRatio(aspectRatio.getAspectRatio());
  });
  
  $(document).ready(function() {
    var gui = require('nw.gui');

    var fileMenu = function() {
      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: 'New Script',
        click: function() {
          flushScript(function() { 
            askSave(function() {
              currentFile.create(function() {});
            });
          });
        }
      }));
      menu.append(new gui.MenuItem({
        label: 'Open...',
        click: function() {
          flushScript(function() {
            askSave(function() {
              var chooser = $('#open-file-input');
              if (currentFile.hasSaved()) {
                chooser.attr('nwworkingdir', path.dirname(currentFile.getSourceConfig().scriptPath));
              }
              chooser.change(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();
                var fullpath = $(this).val();
                if (!fullpath) return;
                var config = {type: 'local', scriptPath: fullpath};
                currentFile.open(config, function() {
                  var _checkDataPath = function(next) {
                    currentFile.checkDataPath(function(err, valid) {
                      if (err || !valid) {
                        var filename = path.basename(currentFile.getSourceConfig().scriptPath);
                        var dataPath = currentFile.getDataPath();
                        alert('The data directory ' + dataPath + ' for ' + filename + ' could not be found. Please locate it.');
                        var chooser = $('#pick-data-path-input');
                        if (currentFile.hasSaved()) {
                          chooser.attr('nwworkingdir', path.dirname(currentFile.getSourceConfig().scriptPath));
                        }
                        chooser.change(function(evt) {
                          evt.preventDefault();
                          evt.stopPropagation();
                          evt.stopImmediatePropagation();
                          var fullpath = chooser.val();
                          if (!fullpath) return;
                          console.log('setting data path', fullpath);
                          currentFile.setDataPath(fullpath, true, true);
                          next();
                        });
                        chooser.trigger('click');
                      }
                      else {
                        next();
                      }
                    });
                  };
                  _checkDataPath(function() {});
                });
              });
              chooser.trigger('click');
            });
          });
        }
      }));
      menu.append(new gui.MenuItem({
        label: 'Save',
        click: function() { flushScript(save); }
      }));
      menu.append(new gui.MenuItem({
        label: 'Save as...',
        click: function() {
          var chooser = $('#save-file-input');
          if (currentFile.hasSaved()) {
            chooser.attr('nwsaveas', path.basename(currentFile.getSourceConfig().scriptPath));
            chooser.attr('nwworkingdir', path.dirname(currentFile.getSourceConfig().scriptPath));
          }
          else {
            chooser.attr('nwsaveas', titleSuggestion() + '.fountain'); 
            chooser.attr('nwworkingdir', '~');
          }
          chooser.change(function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            var fullpath = $(this).val();
            if (!fullpath) return;
            if (path.extname(fullpath) == '') fullpath = fullpath + '.fountain'
            var config = {type: 'local', scriptPath: fullpath};
            flushScript(function() {
              currentFile.saveAs(config, function() {});
            });
          });
          chooser.trigger('click');
        }
      }));
      return menu;
    };

    var source = $('#share-links-template').html();
    var shareLinksTemplate = Handlebars.compile(source);
    var showShareLinks = function() {
      var links = sharing.getLinks();
      var link = (links && links.length) ? links[links.length - 1] : null;
      var html = shareLinksTemplate({link: link});
      $('#share-links .modal-body').html(html);
      $('#share-links').modal('show');
      $('.share-link').click(function() {
        gui.Shell.openExternal($(this).attr('data-href'));
      });
    };

    var shareMenu = function() {
      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: 'Create Player Link',
        click: function() {
          $('#creating-share-link').modal('show');
          sharing.createPlayerLink(function(err) {
            $('#creating-share-link').modal('hide');
            if (err) return;
            showShareLinks();
          });
        }
      }));
      menu.append(new gui.MenuItem({type: 'separator'}));
      menu.append(new gui.MenuItem({
        label: 'Show Player Link',
        click: function() {
          showShareLinks();
        }
      }));
      return menu;
    };

    var aspectRatioSubmenu = function() {
      var checkChange = function(ratio) {
        return function() {
          if (confirm('Are you sure? All images will be resized.')) {
            aspectRatio.setAspectRatio(ratio);
          }
          else {
            updateCheckboxes(aspectRatio.getAspectRatio());
          }
          return false;
        };
      };

      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: '2.35:1 cinescope',
        click: checkChange(2.35),
        type: 'checkbox',
        checked: true
      }));
      menu.append(new gui.MenuItem({
        label: '1.85:1 letterbox',
        click: checkChange(1.85),
        type: 'checkbox',
        checked: false
      }));
      menu.append(new gui.MenuItem({
        label: '16:9 HDTV',
        click: checkChange(1.78),
        type: 'checkbox',
        checked: false
      }));
      menu.append(new gui.MenuItem({
        label: '4:3 SDTV',
        click: checkChange(1.33),
        type: 'checkbox',
        checked: false
      }));

      var ratios = [2.35, 1.85, 1.78, 1.33];
      var updateCheckboxes = function(ratio) {
        //console.log('updateCheckboxes', ratio);
        _.each(menu.items, function(item, index) {
          item.checked = ratio == ratios[index];
        });
      };
      aspectRatio.emitter.on('aspectRatio:change', updateCheckboxes);
      updateCheckboxes();

      return menu;
    };

    var viewMenu = function() {
      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: 'Aspect ratio',
        submenu: aspectRatioSubmenu()
      }));
      return menu;
    };

    var win = gui.Window.get();
    var menubar = new gui.Menu({type: 'menubar'});
    win.menu = menubar;
    win.menu.insert(new gui.MenuItem({label: 'File', submenu: fileMenu()}), 1);
    win.menu.insert(new gui.MenuItem({label: 'View', submenu: viewMenu()}), 3);
    win.menu.insert(new gui.MenuItem({label: 'Share', submenu: shareMenu()}), 4);

    gui.Window.height = 100;

  });

  var showStats = function() {
    $('#stats-window .modal-body').html(fountainManager.generateBoardStats());
    $('#stats-window').modal('show');
    $('.stats-scene-complete').click(function() {
      fountainManager.selectSceneAndScroll(parseInt($(this).attr('data-scene')));
    });
  };

  // hack necessary to fix window overscrolling sometimes (e.g., on pageup/down)
  window.setInterval(scrollToTop, 1000);

  var gui = require('nw.gui');
  gui.Window.get().on('close', function() {
    this.hide();  // Pretend to be closed already
    flushScript(function() {
      currentFile.save(function(err) {
        gui.Window.get().close(true);
      });
    });
  });

  //window.setInterval(window.scrollTo(0), 1000);
  //window.setInterval($('body').scrollTo(0), 1000);

  window.ui = {
    getActiveState: function() { return activeState; },
    emitter: emitter
  };

}).call(this);