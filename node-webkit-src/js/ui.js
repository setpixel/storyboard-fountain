;(function() {
  'use strict';

  var events = require('events');

  var emitter = new events.EventEmitter();
  var editor = null;
  var activeState = 'boards';

  var setActiveState = function(state) {
    activeState = state;
    emitter.emit('activeState:change', activeState);
  };

  var resizeView = function() {
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

    if (((canvasDim[0]-(canvasSidePadding*2))/(canvasDim[1]-(canvasSidePadding*2)-captionHeight)) >= (2.35/1)) {
      var canvasHeight = (canvasDim[1]-(canvasSidePadding*2)-captionHeight);
      var canvasWidth = (canvasDim[1]-(canvasSidePadding*2)-captionHeight) * (2.35/1);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('width', canvasWidth);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('height', canvasHeight);

      $(".drawing-canvas .canvas, .drawing-canvas img").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight);
      $(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2));

      $(".drawing-canvas .caption").css('left', ((canvasDim[0] - canvasWidth)/2));
      $(".drawing-canvas .caption").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight);
      $(".drawing-canvas .caption").css('width', canvasWidth);
    } else {
      var canvasHeight = (windowWidth-boardslistWidth-(canvasSidePadding*2))*(1/2.35);
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
    $('#script').css('height', scriptHeight + 'px');

    $("#scriptpane").css('width', canvasDim[0]);
    $("#scriptpane").css('height', canvasDim[1]);

    var canvasWidth = (canvasDim[0] - (canvasSidePadding * 2));
    $("#scripttext").css('width', canvasWidth + 'px');

    var calcEditorWidth = function() {
      var o = $('<div>' + 'x' + '</div>')
        .css({'position': 'absolute', 'left': 0, 'white-space': 'nowrap', 'visibility': 'hidden', 'font': 'Courier New', 'font-size': '18px', 'width': '62ch'})
        .appendTo($('body'))
      var w = o.width();
      o.remove();
      return w;
    }
    var editorWidth = calcEditorWidth();
    var editorSpace = canvasDim[0] - canvasSidePadding * 2 - 20 * 2;
    //console.log('editor resize', editorSpace, editorWidth, Math.floor(18 * editorSpace / editorWidth) + 'px');
    if (editorSpace < editorWidth) {
      $('.CodeMirror').css('font-size', Math.floor(18 * editorSpace / editorWidth) + 'px');
    }

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
      $('#scriptpane').hide();
      $('#drawpane').show();
      $('#boards-toolbar').show();
      $('#script-toolbar').hide();
      setActiveState('boards');
    }));

    $('#tab-scripttext').click(checkDisabled(function() {
      $('#scriptpane').show();
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

    $("#bttn-copy").click(checkDisabled(sketchpane.copy));
    $("#bttn-paste").click(checkDisabled(sketchpane.paste));

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

    $(window).keydown(function(e){
      console.log(e.keyCode);

      if (activeState == 'boards') {
        if (recorder.getState() == 'paused') {
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
              sketchpane.copy();
              break;
            case 86:  // v
              sketchpane.paste();
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

          }
        }
        else {
          switch (e.keyCode) {
            case 27:  // enter
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
      }
      else {
        // script editor

        switch (e.keyCode) {
          case 69:  // e
            if (e.metaKey) {  // cmd + e
              scriptEditor.toggleExpandNotes();
            }
            break;
          case 78:  // n
            if (e.metaKey) {  // cmd + n
              scriptEditor.toggleAutoIndent();
            }
            break;
        }
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
      console.log('fountaManager selection:change', chunkIndex, boardIndex);
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
  });
  
  $(document).ready(function() {
    var gui = require('nw.gui');

    var fileMenu = function() {
      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: 'New',
        click: function() {
          currentFile.create(function() {});
        }
      }));
      menu.append(new gui.MenuItem({
        label: 'Open...',
        click: function() {
          var chooser = $('#open-file-input');
          chooser.change(function(evt) {
            var path = $(this).val();
            console.log(path);
            var source = {
              type: 'local',
              filename: path + '/config.json'
            };
            currentFile.open(source, function() {});
          });
          chooser.trigger('click');
        }
      }));
      menu.append(new gui.MenuItem({
        label: 'Save as...',
        click: function() {
          var chooser = $('#save-file-input');
          chooser.change(function(evt) {
            var path = $(this).val();
            console.log(path);
            var source = {
              type: 'local',
              filename: path + '/config.json'
            };
            currentFile.save(source, function() {});
          });
          chooser.trigger('click');
        }
      }));
      return menu;
    };

    var source = $('#share-links-template').html();
    var shareLinksTemplate = Handlebars.compile(source);
    var showShareLinks = function() {
      var html = shareLinksTemplate({links: sharing.getLinks()});
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
          sharing.createPlayerLink(function(err, url) {
            $('#creating-share-link').modal('hide');
            if (err) return;
            showShareLinks();
          });
        }
      }));
      menu.append(new gui.MenuItem({
        label: 'Shared Links',
        click: function() {
          showShareLinks();
        }
      }));
      return menu;
    };

    var win = gui.Window.get();
    var menubar = new gui.Menu({type: 'menubar'});
    menubar.append(new gui.MenuItem({label: 'File', submenu: fileMenu()}));
    menubar.append(new gui.MenuItem({label: 'Share', submenu: shareMenu()}));
    win.menu = menubar;

    gui.Window.height = 100;

  });

  var showStats = function() {
    $('#stats-window .modal-body').html(fountainManager.generateBoardStats());
    $('#stats-window').modal('show');
    $('.stats-scene-complete').click(function() {
      fountainManager.selectSceneAndScroll(parseInt($(this).attr('data-scene')));
    });
  };


  window.setInterval(resizeView, 1000);

  //window.setInterval(window.scrollTo(0), 1000);
  //window.setInterval($('body').scrollTo(0), 1000);

  window.ui = {
    getActiveState: function() { return activeState; },
    emitter: emitter
  };

}).call(this);