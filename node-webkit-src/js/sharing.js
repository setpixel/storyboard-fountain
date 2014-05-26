;(function() {

  var links = [];

  var createPlayerLink = function(next) {
    // TODO: force save
    // zip the files
    console.log('creating tmp name');
    var tmp = require('tmp');
    tmp.tmpName({prefix: 'files-', postfix: '.zip'}, function _tempFileCreated(err, tmpPath, fd) {
      if (err) return next(err);
      console.log('tmp name created', tmpPath);

      // TODO: make this work with s3
      var path = localSource.localPath();
      var exec = require('child_process').exec;
      var cmd = "cd " + path + " && zip -r -X " + tmpPath + " config.json script.fountain images/*-large.jpeg";
      console.log('zipping', cmd);
      exec(cmd, function _zippedFile(err) {
        console.log('zipped', err, path);
        if (err) return next(err);

        // post to player service
        var fs = require('fs');
        var request = require('request');
        var playerServiceUrl = 'http://player.storyboardfountain.com/shares';
        var r = request.post(playerServiceUrl, function _posted(err, httpResponse, body) {
          console.log('posted', err, body);
          if (err) return next(err);

          // get the url
          try {
            var url = JSON.parse(body).url;
          }
          catch (e) {
            return next(e);
          }
          links.push({url: url, name: new Date().toString()});
          localStorage.setItem('share-links', JSON.stringify(links));
          next(null, url);
        });
        var form = r.form();
        form.append('files[]', fs.createReadStream(tmpPath));
      });
    });
  };

  var getLinks = function() {
    return links;
  };
  
  $(document).ready(function() {
    var data = localStorage.getItem('share-links');
    if (data) {
      links = JSON.parse(data);
    }
  });

  var sharing = window.sharing = {
    createPlayerLink: createPlayerLink,
    getLinks: getLinks
  };

}).call(this);