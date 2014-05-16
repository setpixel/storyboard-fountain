;(function() {
  'use strict';

  var AWS = require('aws-sdk');
  var s3 = new AWS.S3();

  var awsConfig = null;
  var name = null;
  var config = null;

  var settings = function() {
    return {
      AUTO_UPLOAD_LAYER_TIME: 20,
      AUTO_UPLOAD_FLAT_TIME: 60
    }
  };

  var setup = function(_awsConfig) {
    awsConfig = _awsConfig;
    AWS.config.update({
      "accessKeyId": awsConfig.accessKeyId, 
      "secretAccessKey": awsConfig.secretAccessKey, 
      "region": awsConfig.region
    });
  }

  var create = function(next) {
    name = 'script' + Date.now();
    config = {
      name: name,
      title: 'Untitled'
    };
    var writeConfigFile = function() {
      var params = {
        Bucket: awsConfig.bucket, 
        ACL: 'public-read',
        ContentType: 'application/json',
        Key: 'config/' + name + '.json', 
        Body: JSON.stringify(config)
      };
      s3.putObject(params, function(err, data) {
        if (err) {
          next(err);
          console.log(err);
        }   
        else {
          writeScriptFile();
        }   
      });
    };
    var writeScriptFile = function() {
      var params = {
        Bucket: awsConfig.bucket, 
        ACL: 'public-read',
        ContentType: 'text/plain',
        Key: 'script/' + filename + '.fountain', 
        Body: currentFile.NEW_SCRIPT_TEXT
      };
      s3.putObject(params, function(err, data) {
        if (err) {
          next(err);
          console.log(err);
        }   
        else {
          next(null, {type: 's3', awsConfig: awsConfig, name: name});
        }   
      });
    };
    writeConfigFile();
  };

  /**
   * opts: {type: 's3', awsConfig, name}
   * next expects (err, cfg)
   */
  var load = function(opts, next) {
    if (opts.awsConfig && opts.name) {
      awsConfig = opts.awsConfig;
      name = opts.name;
      var loadConfig = function() {
        var params = {
          Bucket: awsConfig.bucket,
          Key: 'config/' + name + '.json'
        };
        s3.getObject(params, function(err, data) {
          if (err) {
            next(err);
          }
          else {
            config = JSON.parse(data.Body.toString());
            loadScript();
          }
        });
      };
      var loadScript = function() {
        var params = {
          Bucket: awsConfig.bucket,
          Key: 'script/' + name + '.fountain'
        };
        s3.getObject(params, function(err, data) {
          if (err) {
            next(err);
          }
          else {
            var cfg = {
              script: data.Body.toString(),
              title: config.title
            };
            next(null, cfg);
          }
        });
      };
      loadConfig();
    }
    else {
      create(next);
    }
  };

  var imageUrl = function(filename) {
    return 'http://' + awsConfig.bucket + '/images/' + name + '/' + filename;
  }

  var saveScript = function(cfg) {
    var params = {
      Bucket: awsConfig.bucket,
      ACL: 'public-read',
      ContentType: 'text/plain',
      Key: 'script/' + name + '.fountain', 
      Body: cfg.script
    };
    s3.putObject(params, function(err, data) {
      if (err) {
        console.log(err);
      }   
    });
  };

  var saveImage = function(filename, imageData, contentType) {
    var dfd = new $.Deferred();
    var buf = new Buffer(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    var s3 = new AWS.S3(); 
    var params = {
      Bucket: awsConfig.bucket,
      ACL: 'public-read',
      ContentLength: buf.length,
      ContentType: contentType,
      Key: 'images/ ' + name + '/' + filename, 
      Body: buf
    };
    s3.putObject(params, function(err, data) {
        if (err) {
          dfd.reject();
          console.log(err);
        }   
        else {
          dfd.resolve();
          console.log("Successfully uploaded data to myBucket/myKey");     
        }
    });
    return dfd.promise();
  };

  var s3Source = window.s3Source = {
    settings: settings,
    setup: setup,
    create: create,
    load: load,
    imageUrl: imageUrl,
    saveScript: saveScript,
    saveImage: saveImage
  };

}).call(this);