/**
 */

;(function() {
  'use strict';

  var util = require('util');

  //storyboardState.loadURL("https://s3-us-west-2.amazonaws.com/storyboard.setpixel.com/test.fountain");

  //fountainManager.loadURL("https://dl.dropboxusercontent.com/u/10266/sketch/data/steel.fountain");
  
  //fountainManager.loadURL("https://s3-us-west-2.amazonaws.com/storyboard.setpixel.com/test.fountain");

  var currentSource = null;
  var currentConfig = null;
  var sourceModule = null;
  var SOURCES = {
    local: window.localfs,
    s3: window.s3fs
  };


  var openOnStartup = function() {
    var source = localStorage.getItem("editing");
    if (source) {
      try {
        source = JSON.parse(source);
      }
      catch (e) {
        log(e);
        source = null;
      }
    }
    log('source', util.inspect(source), typeof(source));
    if (source) {
      open(source);
    }
    else {
      create();
    }
  };

  var source = function() {
    return currentSource;
  }

  var config = function() {
    return currentConfig;
  }

  var open = function(source) {
    var next = function(err, config) {
      if (err) {
        log('failed to load', err);
        localStorage.removeItem("editing");
        create();
      }
      else {
        currentConfig = config;
        console.log('sourceModule = ', currentConfig);
        fountainManager.load(currentConfig);
        // ...
      }
    };

    log('open', source);
    if (source && source.type) {
      currentSource = source;
      localStorage.setItem("editing", JSON.stringify(currentSource));
      log('set localstorage and it is now', localStorage.getItem('editing'));
      sourceModule = SOURCES[currentSource.type];
      console.log('sourceModule = ', currentSource.type, sourceModule);
      sourceModule.load(source, next);
    }
    else {
      next('invalid source');
    }
  };

  var create = function() {
    var type;
    if (currentSource) {
      type = currentSource.type || 'local';
    }
    else {
      type = 'local';
    }
    log('create', type);
    SOURCES[type].create(function(err, source) {
      log('created', err, source);
      if (!err) {
        open(source);
        log('opened');
      }
    });
  };

  var saveScript = function() {
    currentConfig.script = fountainManager.exportScriptText();
    sourceModule.saveScript(currentConfig);
  }

  var imageUrl = function(name) {
    console.log('sourceModule = ', currentSource.type, sourceModule);
    return sourceModule.imageUrl(name);
  }

  var saveImage = function(filename, imageData, contentType) {
    return sourceModule.saveImage(filename, imageData, contentType);
  }

  var currentFile = window.currentFile = {
    /**
     * the source of the open file
     * - type: 'local' | 's3' | ...
     * - other type-specific params
     */
    //source: source,
    /**
     * data for the open file
     * - script: content of the script
     * - title
     */
    //config: config,
    //create: create,
    //open: open,
    //save: save,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage
  };

  $(document).ready(function() {
    process.nextTick(openOnStartup);
  });

}).call(this);