/**
 */

;(function() {
  'use strict';

  var path = require('path');
  var gui = require('nw.gui');
  var util = require('util');
  var co = require('co');
  var thunkify = require('thunkify');

  var sourceConfig = getSetting('editing', {});
  var SOURCES = {
    local: window.localSource,
    s3: window.s3Source
  };

  var source = function(type) {
    return SOURCES[type || sourceConfig.type];
  };

  var restoreOnStartup = function(next) {
    console.log('restoreOnStartup', sourceConfig, source());
    if (sourceConfig && source()) {
      // open the existing file
      open(sourceConfig, next);
    }
    else {
      // create a new file
      create(next);
    }
  };

  var loadSource = function(source, next) {
    sourceConfig = source.config;
    localStorage.setItem("editing", JSON.stringify(source.config));
    fountainManager.load(source.data);
    gui.Window.get().title = 'Storyboard Fountain - ' + path.basename(source.config.scriptPath);
    next();
  }

  var open = function(config, next) {
    if (config && source(config.type)) {
      source(config.type).load(config, function(err, source) {
        if (err) {
          localStorage.removeItem('editing');
          next(err);
        }
        else {
          console.log('loadSource', source);
          loadSource(source, next);
        }
      });
    }
    else {
      next('invalid config');
    }
  };

  var create = function(next) {
    source('local').create(function(err, source) {
      if (err) {
        next(err);
      }
      else {
        console.log('loadSource', source);
        loadSource(source, next);
      }
    });
  };

  var saveAs = function(config, next) {
    save(function() {
      source().saveAs(config.scriptPath, function(err, source) {
        if (err) {
          console.log('saveAs err', err);
          next(err);
        }
        else {
          console.log('loadSource', source);
          loadSource(source, next);
        }
      })
    });
  };

  var saveScript = function(next) {
    var script = fountainManager.exportScriptText();
    source().saveScript(script, next);
  }

  var imageUrl = function(name) {
    return source().imageUrl(name);
  }

  var saveImage = function(filename, imageData, contentType) {
    return source().saveImage(filename, imageData, contentType);
  }

  var settings = function() {
    return source().settings();
  }

  var saveScriptTh = thunkify(saveScript);

  var save = function(next) {
    co(function *() {
      // save the script
      yield saveScriptTh();
      // save any dirty images
      if (storyboardState.getDirty()) {
        yield storyboardState.forceSave();
      }
    })(next);
  };

  var hasSaved = function() {
    return source().hasSaved();
  };

  var getDataPath = function() {
    return source().getDataPath();
  }

  var setDataPath = function(path, isAbsolute, ensureExists, fromParsing) {
    if (ensureExists && path != getDataPath()) {
      alert('The data path has been changed. Existing images may be broken unless changed back.');
    }
    source().setDataPath(path, isAbsolute, ensureExists);
    if (!fromParsing) {
      // export with the new data path
      var script = fountainManager.exportScriptText();
      source().saveScript(script, function() {
        loadSource(source().getSource(), function() {});
      });
    }
  };

  var checkDataPath = function(next) {
    source().checkDataPath(next);
  }

  var currentFile = window.currentFile = {
    create: create,
    open: open,
    saveAs: saveAs,
    save: save,
    settings: settings,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage,
    hasSaved: hasSaved,
    getDataPath: getDataPath,
    setDataPath: setDataPath,
    checkDataPath: checkDataPath,
    getSourceConfig: function() { return sourceConfig; }
  };

  $(document).ready(function() {
    var afterRestore = function(err) {
      if (err) {
        console.log('error starting up', err.toString());
        gui.Window.get().close(true);
        return;
      }
      console.log('done with startup');
    };
    restoreOnStartup(function(err) {
      gui.Window.get().show();
      $(".nano").nanoScroller();
      updater.check(function () {});
      if (err) {
        console.log('err on restore', err.toString());
        create(afterRestore);
      }
      else {
        var _checkDataPath = function(next) {
          checkDataPath(function(err, valid) {
            if (err || !valid) {
              var path = require('path');
              var filename = path.basename(sourceConfig.scriptPath);
              alert('The data directory for ' + filename + ' could not be found. Please locate it.');
              var chooser = $('#pick-data-path-input');
              var onChoose = function() {
                var path = chooser.val();
                if (path && path.length) {
                  setDataPath(path, true);
                  next();
                }
                else {
                  alert('It looks like you didn\'t choose a directory. Images will be broken.');
                }
                next();
              };
              chooser.change(onChoose);
              document.body.onfocus = function() {
                document.body.onfocus = null;
                onChoose();
              };
              chooser.trigger('click');
            }
            else {
              next();
            }
          });
        };
        _checkDataPath(afterRestore);
      }
    });
  });

}).call(this);
