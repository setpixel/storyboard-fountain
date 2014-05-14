;(function() {
  'use strict';
  
  var fs = require('fs');
  var path = require('path');

  var pathname = null;
  var filename = null;
  /**
   * - script: path to script file
   * - images: path to images directory
   * - title: title of the script
   */
  var config = null;

  var create = function(next) {
    var tmp = require('tmp');
    tmp.dir(function(err, path) {
      if (err) return next(err);
      log('new script', path);
      pathname = path;
      filename = path + '/config.json';
      config = {
        script: 'script.fountain',
        images: 'images',
        title: 'Untitled'
      };
      // write the script file
      fs.writeFileSync(filename, JSON.stringify(config), 'utf8');
      // create the images directory
      fs.mkdirSync(pathname + '/' + config.images);
      var cfg = {
        script: "Title: **THE LAST BIRTHDAY CARD**\n"+
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
"",
        title: config.title
      };
      // write the script file
      fs.writeFileSync(pathname + '/' + config.script, cfg.script, 'utf8');

      next(null, {type: 'local', filename: filename});
    });
  };

  /**
   * opts: {type: 'local', filename: path to config file}
   * next expects (err, cfg)
   */
  var load = function(opts, next) {
    if (opts.filename) {
      pathname = path.dirname(opts.filename);
      filename = opts.filename;
      try {
        // TODO: make async
        config = JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
        var script = fs.readFileSync(pathname + '/' + config.script).toString();
      }
      catch (e) {
        log('error', e);
        next(e);
        return
      }
      var cfg = {
        script: script,
        title: config.title
      };
      next(null, cfg);
    }
    else {
      create(next);
    }
  };

  var imageUrl = function(name) {
    return 'http://localhost:8081/images/' + name;
    //return 'file://' + pathname + '/' + config.images + '/' + name;
  };

  var saveScript = function(cfg) {
    fs.writeFileSync(pathname + '/' + config.script, cfg.script);
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

  var localfs = window.localfs = {
    create: create,
    load: load,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage
  };

}).call(this);