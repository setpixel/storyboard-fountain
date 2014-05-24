module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower: {
      all: {
        dest: 'public/lib'
      }
    },
    coffee: {
      compile_app_js: {
        expand: true,
        flatten: true,
        cwd: 'src/client',
        src: ['*.coffee'],
        dest: 'public/app/',
        ext: '.js'
      }
    }
  });

  var path = require('path');

  grunt.registerMultiTask('bower', 'Copy bower components', function() {
    var done  = this.async()
      , dest  = this.data.dest
      , bower = {
          cmd  : 'bower'
        , args : ['list', '--paths']
        };

    if (!grunt.file.isDir(dest)) {
      grunt.verbose.writeln('Creating dest dir: ' + dest);
      grunt.file.mkdir(dest);
    }

    grunt.util.spawn(bower, _copy);

    function _copy (err, result, code) {
      var components
        , files
        , name;

      if (err || code) {
        grunt.log.error("`bower list --paths' command failed to run:");
        grunt.log.error(err.message || err);
        grunt.log.error('Exit code: ' + code);
        done(false);
        return;
      }

      try {
        components = JSON.parse(result);
      } catch (e) {
        grunt.log.error("Failed to parse `bower list --paths' output:");
        grunt.log.error(e.message || e);
        done(false);
        return;
      }

      for (name in components) {
        files = components[name];
        files = grunt.util.kindOf(files) == 'string' ? [files] : files;
        files.forEach(function (file) {
          var filepath = file.split('bower_components/')[1];
          var destname = path.join(dest, filepath);
          grunt.file.copy(file, destname);
          grunt.log.writeln(file + ' -> ' + destname.cyan);
        });
      }

      done();
    }
  });

  grunt.loadNpmTasks('grunt-iced-coffee');
};
