;(function() {
  'use strict';
  
  var gui = require('nw.gui');
  var fs = require('fs');
  var path = require('path');
  var thunkify = require('thunkify');
  var co = require('co');
  var cofs = require('co-fs');
  var shortId = require('shortid');
  var fsExtra = require('fs-extra');
  var cocopy = thunkify(fsExtra.copy);
  var mkdirp = require('mkdirp');

  var config = {};
  var data = {};

  var setLoaded = function(obj) {
    config = {type: 'local', scriptPath: obj.scriptPath};
    data = {script: obj.script, dataPath: obj.dataPath};
    console.log('setLoaded');
  };

  var getSource = function() {
    return {config: config, data: data};
  };

  var getFullDataPath = function() {
    return path.dirname(config.scriptPath) + '/' + data.dataPath;
  };

  var settings = function() {
    return {
      AUTO_UPLOAD_LAYER_TIME: 4,
      AUTO_UPLOAD_FLAT_TIME: 5
    }
  };

  // generate a unique name for and make a data directory
  var makeDataPath = function *(basepath, name) {
    var alt = '';
    while (true) {
      var path = basepath + '/' + name + alt + '_data';
      if (yield cofs.exists(path)) {
        alt = '_' + shortId.generate();
      }
      else {
        yield cofs.mkdir(path);
        yield cofs.mkdir(path + '/images');
        return './' + name + alt + '_data';
      }
    }
  };

  /**
   * Create a new script.
   *
   * pass a callback function
   * callback is called with:
   * - TODO
   */
  var create = function(next) {
    co(function *() {
      var name = shortId.generate();
      var path = autosavesPath();
      var dataPath = yield makeDataPath(path, name);
      var script = example.fountainText(dataPath);
      var scriptPath = path + '/' + name + '.fountain';
      // write the script file
      yield cofs.writeFile(scriptPath, script, 'utf8');
      // ok, we've successfully created it, set the module vars
      setLoaded({scriptPath: scriptPath, dataPath: dataPath, script: script});
      return getSource();
    })(next);
  };

  /**
   * Open an existing script.
   *
   * config: {type: 'local', scriptPath: path to script file}
   * next expects (err, {config, data})
   */
  var load = function(config, next) {
    co(function *() {
      if (config.type != 'local' || !config.scriptPath) return next('invalid config');
      var scriptPath = config.scriptPath;
      var script = (yield cofs.readFile(scriptPath)).toString();
      setLoaded({script: script, scriptPath: scriptPath});
      return getSource();
    })(next);
  };

  var imageUrl = function(name) {
    return 'file://' + getFullDataPath() + '/images/' + name;
  };

  var saveScript = function(script, next) {
    data.script = script;
    fs.writeFile(config.scriptPath, script, next);
  };

  var saveImage = function(filename, imageData, contentType) {
    var dfd = new $.Deferred();
    if (data.dataPath) {
      imageData = imageData.replace(/^data:image\/\w+;base64,/, '');
      var file = getFullDataPath() + '/images/' + filename;

      fs.writeFile(file, imageData, 'base64', function(err) {
        if (err) dfd.reject(); else dfd.resolve();
      });
    }
    else {
      dfd.reject();
    }
    return dfd.promise();
  };

  var saveAs = function(toPath, next) {
    co(function *() {
      if (!data.dataPath) {
        return new Error('invalid data directory');
      }
      if (toPath == config.scriptPath) {
        // don't need to move
        return getSource();
      }

      var src, dst;
      // copy the script file over
      src = config.scriptPath;
      console.log('src', src);
      var fileExists = yield cofs.exists(toPath);
      var dirExists = yield cofs.exists(path.dirname(toPath));
      var dirIsDirectory = (yield cofs.stat(path.dirname(toPath))).isDirectory();
      if (fileExists) {
        var stat = yield cofs.stat(toPath);
        if (stat.isDirectory()) {
          dst = toPath + '/' + path.basename(src);
        }
        else if (stat.isFile()) {
          dst = toPath;
        }
        else {
          console.log('invalid destination1');
          throw new Error('invalid destination');
        }
      }
      else if (dirExists && dirIsDirectory) {
        dst = toPath;
      }
      else {
        console.log('invalid destination');
        throw new Error('invalid destination');
      }
      console.log('copying script: ', src, dst);
      yield cocopy(src, dst);

      var scriptPath = dst;

      // copy the data dir over
      src = getFullDataPath();
      dst = path.dirname(scriptPath) + '/' + path.basename(src);
      console.log('copying data: ', src, dst);
      if (path.normalize(src) != path.normalize(dst)) {
        yield cocopy(src, dst);
      }

      setLoaded({script: data.script, scriptPath: scriptPath, dataPath: data.dataPath});

      return getSource();
    })(next);
  }

  // assume they haven't saved if we are saving to the autosave directory
  var hasSaved = function() {
    return path.dirname(config.scriptPath) != autosavesPath();
  };

  var getDataPath = function() {
    return data.dataPath;
  };

  var setDataPath = function(fullpath, isAbsolute, ensureExists) {
    if (isAbsolute) {
      data.dataPath = path.relative(path.dirname(config.scriptPath), fullpath);
    }
    else {
      data.dataPath = fullpath;
    }
    if (ensureExists) {
      // make the images dir (and therefore the data dir)
      mkdirp(getFullDataPath() + '/images');
    }
    console.log('setDataPath', fullpath, data.dataPath);
  };

  var checkDataPath = function(next) {
    co(function *() {
      var dataPath = getFullDataPath() + '/images';
      return (
        (yield cofs.exists(dataPath)) && 
        (yield cofs.stat(dataPath)).isDirectory()
      );
    })(next);
  };

  var tmp = require('tmp');
  var co_tmpName = thunkify(tmp.tmpName);
  var childProcess = require('child_process');
  var co_exec = thunkify(childProcess.exec);

  var fixPath = function(_path) {
    return _path.replace(/(\s)/g, "\\ ");
  };

  var createPlayerZip = function(next) {
    co(function *() {
      var tmpPath = yield co_tmpName({prefix: 'files-', postfix: '.zip'});
      var _tmpPath = fixPath(tmpPath);
      console.log('tmp name created', tmpPath);

      var scriptPathDir = fixPath(path.dirname(config.scriptPath));
      var scriptPathName = fixPath(path.basename(config.scriptPath));
      var cmd = "cd " + scriptPathDir + " && zip -r -X " + _tmpPath + " " + scriptPathName;
      console.log('zipping', cmd);
      yield co_exec(cmd);

      var dataPath = fixPath(getFullDataPath());
      var cmd = "cd " + dataPath + " && zip -r -X " + _tmpPath + " images/*-large.jpeg";
      console.log('zipping', cmd);
      yield co_exec(cmd);

      return tmpPath;
    })(next);
  };

  var localSource = window.localSource = {
    settings: settings,
    create: create,
    load: load,
    saveAs: saveAs,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage,
    hasSaved: hasSaved,
    getDataPath: getDataPath,
    setDataPath: setDataPath,
    checkDataPath: checkDataPath,
    getSource: getSource,
    createPlayerZip: createPlayerZip
  };

  function autosavesPath() {
    return gui.App.dataPath + '/Autosaves';
  }

  function checkAutosavesPath() {
    var path = autosavesPath();
    fs.exists(path, function(exists) {
      if (!exists) fs.mkdir(path);
    });
  }

  checkAutosavesPath();

}).call(this);