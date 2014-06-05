module.exports = function(grunt) {
  
  grunt.initConfig({
    nodewebkit: {
      options: {
        // Where the build version of the app is saved
        build_dir: './webkitbuilds', 
        mac_icns: './icon.icns',
        mac: true,
        win: false,
        linux32: false,
        linux64: false
      },
      // Your node-webkit app
      src: ['./node-webkit-src/**/*'] 
    }
  });

  grunt.loadNpmTasks('grunt-node-webkit-builder');

  grunt.registerTask('sfpasteboard', function() {
    var done = this.async();
    var fs = require('fs');
    if (!fs.existsSync('node-webkit-src/tools')) {
      fs.mkdirSync('node-webkit-src/tools');
    }
    var exec = require('child_process').exec;
    exec('gcc -Wall -g -O3 -ObjC -framework Foundation -framework AppKit -o node-webkit-src/tools/sfpasteboard sfpasteboard/sfpasteboard.m', done);
  });

  grunt.registerTask('build', ['sfpasteboard', 'nodewebkit']);
};
