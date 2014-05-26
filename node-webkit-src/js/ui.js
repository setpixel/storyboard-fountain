;(function() {
  'use strict';

  var editor = null;

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

    var scriptHeight = windowHeight - toolbarHeight - $('.tabs').height();
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
    console.log('editor resize', editorSpace, editorWidth, Math.floor(18 * editorSpace / editorWidth) + 'px');
    if (editorSpace < editorWidth) {
      $('.CodeMirror').css('font-size', Math.floor(18 * editorSpace / editorWidth) + 'px');
    }
  }

  var confirmExit = function() {
    if (storyboardState.getDirty()) {
      window.setTimeout(storyboardState.forceSave, 1000);
      return "Not finished saving yet. Are you sure?";
    }
  };

  $(document).ready(function() {
    resizeView();


    $('.tab').click(function(){
      $(this).parent().children().removeClass('selected');
      $(this).addClass('selected');
    })

    $('#tab-script').click(function(){
      $('#scriptpane').hide();
      $('#drawpane').show();
      $('#boards-toolbar').show();
      $('#script-toolbar').hide();
    })

    $('#tab-scripttext').click(function() {
      $('#scriptpane').show();
      $('#drawpane').hide();
      if (editor) editor.refresh();
      $('#boards-toolbar').hide();
      $('#script-toolbar').show();
    });

    fountainManager.emitter.once('script:change', function(text) {
      console.log('script:change', text)
      window.editor = editor = CodeMirror($('#scripttext')[0], {
        value: text,
        mode: 'fountain',
        viewportMargin: Infinity,
        theme: 'neo',
        lineWrapping: true
      })
      editor.options.foldOptions = {
        rangeFinder: CodeMirror.fold.note,
        widget: "[[Storyboards]]",
        minFoldSize: 0,
        scanUp: false
      };
      editor.execCommand("foldAll");
      $('.CodeMirror').addClass('auto-indent');
      $('#bttn-auto-indent').addClass('selected');
      console.log('script:change done')
    });

    $(window).resize(resizeView);

    window.onbeforeunload = confirmExit;

    $('#bttn-auto-indent').click(function() {
      if ($('#bttn-auto-indent').hasClass('selected')) {
        $('.CodeMirror').removeClass('auto-indent')
        $('#bttn-auto-indent').removeClass('selected')
      }
      else {
        $('.CodeMirror').addClass('auto-indent')
        $('#bttn-auto-indent').addClass('selected')
      }
    });

    $('#bttn-expand-notes').click(function() {
      if ($('#bttn-expand-notes').hasClass('selected')) {
        editor.execCommand('foldAll');
        $('#bttn-expand-notes').removeClass('selected');
      }
      else {
        editor.execCommand('unfoldAll');
        $('#bttn-expand-notes').addClass('selected');
      }
    });

    $("#bttn-new-board").click(fountainManager.newBoard);
    $("#bttn-remove-board").click(fountainManager.deleteBoard);

    $("#bttn-previous").click(function() {fountainManager.goNext(-1);});
    $("#bttn-next").click(function() {fountainManager.goNext(1);});

    $("#bttn-undo").click(sketchpane.undo);
    $("#bttn-redo").click(sketchpane.redo);

    $("#bttn-copy").click(sketchpane.copy);
    $("#bttn-paste").click(sketchpane.paste);

    $("#bttn-lightbox").click(sketchpane.toggleLightboxMode);

    sketchpane.emitter.on('lightboxmode:change', function(mode) {
      if (mode) {
        $("#bttn-lightbox").addClass('selected');
      }
      else {
        $("#bttn-lightbox").removeClass('selected');
      }
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
      $(data.selector).click(data.fn);
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
      $(selector).click(function() { sketchpane.setColor(color) });
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

    $(window).keydown(function(e){
      console.log(e.keyCode);

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
  });

}).call(this);