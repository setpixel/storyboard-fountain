;(function() {

  var links = [];

  var createPlayerLink = function(next) {
    currentFile.createPlayerZip(function(err, zipPath) {
      console.log('zipped', err, zipPath);
      if (err) return next(err);

      // post to player service
      var fs = require('fs');
      var request = require('request');
      var playerServiceUrl = 'http://player.storyboardfountain.com/shares';
      var r = request.post(playerServiceUrl, function _posted(err, httpResponse, body) {
        console.log('posted', err, body);
        if (err) return next(err);

        // get the key
        try {
          var key = JSON.parse(body).key;
        }
        catch (e) {
          return next(e);
        }
        var link = {
          playerUrl: 'http://player.storyboardfountain.com/player/' + key,
          boardsUrl: 'http://player.storyboardfountain.com/boards/' + key
        };
        links.push(link);
        localStorage.setItem('share-links', JSON.stringify(links));
        next(null, link);
      });
      var form = r.form();
      form.append('files[]', fs.createReadStream(zipPath));
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