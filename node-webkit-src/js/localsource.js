;(function() {
  'use strict';
  
  var fs = require('fs');
  var path = require('path');
  var thunkify = require('thunkify');
  var co = require('co');
  var cofs = require('co-fs');
  var tmp = require('tmp');

  var tmpDir = thunkify(tmp.dir);

  var pathname = null;
  var filename = null;
  /**
   * - script: path to script file
   * - images: path to images directory
   * - title: title of the script
   */
  var config = null;

  var settings = function() {
    return {
      AUTO_UPLOAD_LAYER_TIME: 20,
      AUTO_UPLOAD_FLAT_TIME: 60
    }
  };

  var setup = function() {}

  var create = function(next) {
    co(function *() {
      try {
        var path = yield tmpDir();
        log('new script', path);
        pathname = path;
        filename = path + '/config.json';
        config = {
          script: 'script.fountain',
          images: 'images',
          title: 'Untitled'
        };
        // write the script file
        yield cofs.writeFile(filename, JSON.stringify(config), 'utf8');
        // create the images directory
        yield cofs.mkdir(pathname + '/' + config.images);
        var cfg = {
          script: currentFile.NEW_SCRIPT_TEXT,
          title: config.title
        };
        // write the script file
        yield cofs.writeFile(pathname + '/' + config.script, cfg.script, 'utf8');
        next(null, {source: {type: 'local', filename: filename}, config: cfg});
      }
      catch (e) {
        next(e);
      }
    })();
  };

  /**
   * opts: {type: 'local', filename: path to config file}
   * next expects (err, cfg)
   */
  var load = function(opts, next) {
    co(function *() {
      try {
        if (opts.filename) {
          pathname = path.dirname(opts.filename);
          filename = opts.filename;
          config = JSON.parse(yield cofs.readFile(filename, {encoding: 'utf8'}));
          var script = (yield cofs.readFile(pathname + '/' + config.script)).toString();
          var cfg = {
            script: script,
            title: config.title
          };
          next(null, {source: opts, config: cfg});
        }
        else {
          create(next);
        }
      }
      catch (e) {
        next(e);
      }
    })();
  };

  var imageUrl = function(name) {
    return 'http://localhost:8081/images/' + name;
    //return 'file://' + pathname + '/' + config.images + '/' + name;
  };

  var saveScript = function(cfg, next) {
    fs.writeFile(pathname + '/' + config.script, cfg.script, next);
  };

  var saveImage = function(filename, imageData, contentType) {
    var dfd = new $.Deferred();
    var data = imageData.replace(/^data:image\/\w+;base64,/, '');
    var file = pathname + '/' + config.images + '/' + filename;
    console.log('saving to', file);
    fs.writeFile(file, data, 'base64', function(err) {
      console.log('saved?', err);
      if (err) dfd.reject(); else dfd.resolve();
    });
    return dfd.promise();
  };

  var express = require('express');
  var app = express();
  app.get('/images/:name.:type', function(req, res, next) {
    log('requesting', req.params.name, req.params.type);
    var file = pathname + '/' + config.images + '/' + req.params.name + '.' + req.params.type;
    fs.stat(file, function(err, stats) {
      if (err) {
        log('not found');
        res.status(404).end();
      }
      else {
        res.setHeader('Content-Type', 'image/' + req.params.type);
        fs.createReadStream(file).pipe(res);
      }
    });
  });
  app.listen(8081);

  var localPath = function() {
    return pathname;
  }

  var ncp = require('ncp');
  var thunkedNcp = thunkify(ncp);

  var save = function(source, fromPath, next) {
    co(function *() {
      try {
        var src = fromPath;
        var dst = path.dirname(source.filename);
        yield thunkedNcp(src, dst);
        //console.log('cp -r', src, dst);
        pathname = dst;
        filename = pathname + '/config.json';
        // TODO: actually get the config here
        config = {
          script: 'script.fountain',
          images: 'images',
          title: 'Untitled'
        };
        next(null, {source: source});
      }
      catch (e) {
        next(e);
      }
    })();
  }

  var localSource = window.localSource = {
    settings: settings,
    setup: setup,
    create: create,
    load: load,
    save: save,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage,
    localPath: localPath
  };

}).call(this);