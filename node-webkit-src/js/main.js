/**
 */

;(function() {
  'use strict';

  var util = require('util');
  require('coffee-script/register');
  window.timeline = require('./js/timeline');
  window.player = require('./js/player');

  var NEW_SCRIPT_TEXT = "Title: **THE LAST BIRTHDAY CARD**\n"+
"Credit: Written by\n"+
"Author: Stu Maschwitz\n"+
"Draft date: 7/8/1998\n"+
"Contact:\n"+
"    PO Box 10031\n"+
"    San Rafael CA 94912\n"+
"    Registered WGAw No. 701428\n"+
"\n"+
"# ACT I\n"+
"\n"+
"= Meet the players and set up the world. Two hit men with very different lives.\n"+
"\n"+
"> HERE WE GO:\n"+
"\n"+
"## Meet Scott\n"+
"\n"+
"= And his friend Baxter.\n"+
"\n"+
"### Scott's SF Apartment\n"+
"\n"+
"INT. SAN FRANCISCO APARTMENT, DAY\n"+
"\n"+
"SCOTT is painting.  Badly.  Let's not mince words.\n"+
"\n"+
"SCOTT\n"+
"sup\n"+
"";

  var currentSource = null;
  var currentConfig = null;
  var sourceModule = null;
  var SOURCES = {
    local: window.localSource,
    s3: window.s3Source
  };


  var openOnStartup = function(next) {
    if (sourceModule) {
      sourceModule.setup(JSON.parse(localStorage.getItem('sourceConfig') || '{}'));
    }

    var source = JSON.parse(localStorage.getItem("editing") || '{}');
    if (source) {
      open(source, function(err) {
        if (err) {
          create(next);
        }
        else {
          next();
        }
      });
    }
    else {
      create(next);
    }
  };

  var source = function() {
    return currentSource;
  }

  var config = function() {
    return currentConfig;
  }

  var open = function(source, next) {
    console.log('open', source);
    if (source && source.type) {
      currentSource = source;
      localStorage.setItem("editing", JSON.stringify(currentSource));
      log('set localstorage and it is now', localStorage.getItem('editing'));
      sourceModule = SOURCES[currentSource.type];
      console.log('sourceModule = ', currentSource.type, sourceModule);
      sourceModule.load(source, function(err, result) {
        if (err) {
          console.log('failed to load', require('util').inspect(err));
          localStorage.removeItem("editing");
          create(next);
        }
        else {
          currentConfig = result.config;
          console.log('sourceModule = ', currentConfig);
          fountainManager.load(currentConfig);
          next();
        }
      });
    }
    else {
      next('invalid source');
    }
  };

  var create = function(next) {
    var type;
    if (currentSource) {
      type = currentSource.type || 'local';
    }
    else {
      type = 'local';
    }
    console.log('create', type);
    SOURCES[type].create(function(err, result) {
      console.log('created', err, result);
      if (err) {
        next(err);
      }
      else {
        open(result.source, next);
        console.log('opened');
      }
    });
  };

  var save = function(source, next) {
    var path = sourceModule.localPath();
    SOURCES[source.type].save(source, path, function(err, result) {
      if (err) return next(err);
      currentSource = result.source;
      sourceModule = SOURCES[currentSource.type];
      currentConfig = result.config;
      localStorage.setItem("editing", JSON.stringify(currentSource));
      next();
    });
  };

  var saveScript = function(next) {
    currentConfig.script = fountainManager.exportScriptText();
    sourceModule.saveScript(currentConfig, next);
  }

  var imageUrl = function(name) {
    console.log('sourceModule = ', currentSource.type, sourceModule);
    return sourceModule.imageUrl(name);
  }

  var saveImage = function(filename, imageData, contentType) {
    return sourceModule.saveImage(filename, imageData, contentType);
  }

  var settings = function() {
    return sourceModule.settings();
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
    create: create,
    open: open,
    save: save,
    NEW_SCRIPT_TEXT: NEW_SCRIPT_TEXT,
    settings: settings,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage
  };

  $(document).ready(function() {
    openOnStartup(function() {
      console.log('done with startup');
    });
  });

}).call(this);