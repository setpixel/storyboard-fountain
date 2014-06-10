# Storyboard Fountain

Storyboard Fountain makes it easy to visualize a screenplay as fast you can draw stick figures. Quickly visualize to test if a scene works. Create and show animatics to others. Make your movie without the cost of making a movie.

[<img src="https://raw.githubusercontent.com/setpixel/storyboard-fountain/master/node-webkit-src/img/icon.png" width=200><br/>Download Storyboard Fountain (Mac v0.0.1)](http://storyboardfountain.com/downloads/StoryboardFountain-0.0.1.zip) (June 9th, 2014)

## Features

* Works directly with Fountain Screenplays.
* Create storyboards associated inside your script. Images saved in a folder next to the script.
* 3 different pen modes and multiple colors.
* Record pitches and play back. (WORKS! No audio yet, though.)
* Edit Fountain script inline without leaving app. (WORKS! Not perfect yet, but pretty rad. Report issues!)
* Export pitches to send via link. (WORKS! No audio yet, though.)
* Export pitches to Final Cut and Premiere Pro. (NOT WORKING YET)

## Getting it running from source

1. Clone repository or download zip.
2. Make sure you have node installed. If not: [nodejs.org and install](http://nodejs.org/).
3. In terminal, in the storyboard-fountain directory run: `npm install`
4. `cd node-webkit-src`
5. `npm install`
5. Install Bower, if you dont have it: `npm install -g bower`
6. `bower install`
7. `cd ..`
8. Make sure you have grunt-cli installed. If not: run: `sudo npm install -g grunt-cli`
9. `grunt build`
10. `open webkitbuilds/releases/storyboard-fountain/mac/storyboard-fountain.app`

## Developing 

You can make changes to the code in `node-webkit-src`. 

To easily run your changes: `webkitbuilds/cache/mac/0.9.2/node-webkit.app/Contents/MacOS/node-webkit node-webkit-src/`

You may also want to use chrome dev tools. To do this open `node-webkit-src/package.json`. Change this: `"toolbar": true,` And re-run to see the toolbar.

Feel free to submit pull requests!

## Issues

Please [create new issues](https://github.com/setpixel/storyboard-fountain/issues/new) in issues. You can also see the milestones for what we are looking to develop next.

## Contributors

Storyboard Fountain was created by [Charles Forman](http://setpixel.com/) and [Chris Smoak](https://github.com/cesmoak)

Contributors (in alphabetical order):
* Charles Forman
* Chris Smoak
* Could be you! 
