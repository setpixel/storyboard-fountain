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
};
