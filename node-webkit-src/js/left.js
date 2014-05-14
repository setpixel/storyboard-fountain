


function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


for (var i=0; i<tokens.length; i++) {
  if (tokens[i].type == "scene_heading") {
    console.log(tokens[i].text);
  }
}





// UNIQUE CHARACTERS

vCharacters = {};
vCharacterList = [];
vCharacterListCount = [];
vMainChars = []

for (var i=0; i<tokens.length; i++) {
  if (tokens[i].type == "character") {
    if (vCharacters.hasOwnProperty(tokens[i].text.split(" (")[0])) {
      vCharacters[tokens[i].text.split(" (")[0]] += 1;
    } else {
      vCharacters[tokens[i].text.split(" (")[0]] = 1;
      vCharacterList.push(tokens[i].text.split(" (")[0]);
    }
  }
}

for ( var key in vCharacters) {
  vCharacterListCount.push([key, vCharacters[key]])
}
vCharacterListCount.sort(function(a,b){return b[1]-a[1]})

vMainChars.push(vCharacterListCount[0][0])
vMainChars.push(vCharacterListCount[1][0])

//console.log("total scenes: " + vSceneCount);
console.log("unique characters: " + vCharacterList.length);
//console.log("pages per scene: " + (vPageCount / vSceneCount));




// words per page
  
var vwordCount = 0;

for (var i=0; i<tokens.length; i++) {
  words = 0;
  switch (tokens[i].type) {
    case 'scene_heading': words = wordCount(tokens[i].text); break;
    case 'action': words = wordCount(tokens[i].text); break;
    case 'character': words = wordCount(tokens[i].text); break;
    case 'parenthetical': words = wordCount(tokens[i].text); break;
    case 'dialogue': words = wordCount(tokens[i].text); break;
    case 'centered': words = wordCount(tokens[i].text); break;
    case 'transition': words = wordCount(tokens[i].text); break;
  }
  vwordCount += words;

}
console.log("total words: " + vwordCount);

console.log("words per page: " + vwordCount / vPageCount);


// words per page
  
var vDialogueCount = 0;
var vDialogueWords = 0;
var vDialogueLongest = 0;
var vActionCount = 0;
var vActionWords = 0;
var vActionLongest = 0;

for (var i=0; i<tokens.length; i++) {
  words = 0;
  switch (tokens[i].type) {
    case 'action': vActionWords += wordCount(tokens[i].text); vActionCount++; vActionLongest = Math.max(vActionLongest, wordCount(tokens[i].text)); break;
    case 'dialogue': vDialogueWords += wordCount(tokens[i].text); vDialogueCount++; vDialogueLongest = Math.max(vDialogueLongest, wordCount(tokens[i].text)); break;
  }
  vwordCount += words;

}

console.log("dialogue lines: " + vDialogueCount);
console.log("dialogue avg: " + (vDialogueWords / vDialogueCount));
console.log("dialogue longest: " + vDialogueLongest);

console.log("dialogue to action: " + (vDialogueWords / vActionWords));
console.log("longest action: " + vActionLongest);


// create script


/*

currentTime

go through each element and add to a script 

  {
    time: 200,
    duration: 100,2
    type: scene
    text: sajdakshjdj


  }



*/



function renderScenes() {

  var wwidth = $( window ).width();

  console.log(wwidth);

  var x = 0;

  var previousTime = 0;
  var previousColor = "000";

  for (var i=0; i<vScript.length; i++) {
    switch (vScript[i].type) {
      case 'scene_heading':
        x++;

        if (x > 1) {
          xPos = Math.floor((previousTime/(vScript[vScript.length-1].time+duration))*wwidth)
          xWidth = Math.ceil((vScript[i].time - previousTime)/(vScript[vScript.length-1].time+duration)*wwidth)
          $( "#menu-float" ).append( "<div style='position: absolute; left: " + xPos + "px; top: 0px; width: "+xWidth+"px; background-color: #" + previousColor + "; height: 20px;'></div>" );
        }

        previousTime = vScript[i].time;
        previousColor = vSceneListColors[vScript[i].text.split(" - ")[0]].color
          
        //console.log(vScript[i].time /60000 + " " + vScript[i].text);

        break;
    }
  }
           x++;
           xPos = Math.floor((previousTime/(vScript[vScript.length-1].time+duration))*wwidth)
          xWidth = Math.ceil(((vScript[vScript.length-1].time+duration) - previousTime)/(vScript[vScript.length-1].time+duration)*wwidth)
           $( "#menu-float" ).append( "<div style='position: absolute; left: " + xPos + "px; top: 0px; width: "+xWidth+"px; background-color: #" + previousColor + "; height: 20px;'> </div>" );

}

renderScenes();

var currentSceneLength = 4000;
var currentSceneStart = 0;


  var vSceneCharacters = {};
  var vSceneCharacterList = [];


function renderScene(loc) {
  var wwidth = $( window ).width();

  //console.log(loc);

  currentSceneStart = vScript[loc].time;



 vSceneCharacters = {};
  vSceneCharacterList = [];




  var i = loc+1;
  foundNextScene = false;
  while (foundNextScene == false) {
    switch (vScript[i].type) {
      case 'scene_heading':
        currentSceneLength = vScript[i].time - currentSceneStart;
        foundNextScene = true;
        break;
      case 'dialogue':
        if (vSceneCharacters.hasOwnProperty(vScript[i].character.split(" (")[0])) {
          vSceneCharacters[vScript[i].character.split(" (")[0]] += 1;
        } else {
          vSceneCharacters[vScript[i].character.split(" (")[0]] = 1;
          vSceneCharacterList.push(vScript[i].character.split(" (")[0]);
        }
        break;
    }
    i++;
  }

  $( "#menu-float2" ).empty();

  var i = loc+1;
  foundNextScene = false;
  while (foundNextScene == false) {
    switch (vScript[i].type) {
      case 'scene_heading':
        foundNextScene = true;
        break;
      case 'action':
        xPos = ((vScript[i].time - currentSceneStart)/currentSceneLength)*wwidth
        xWidth = vScript[i].duration/currentSceneLength*wwidth-1;
        
        yPos = 0;

        $( "#menu-float2" ).append( "<div style='position: absolute; left: " + xPos + "px; top: " + (yPos * 5 +1 )+ "px; width: "+xWidth+"px; background-color: rgba(255,255,255,0.3); height: 5px; border-radius: 1.5px;'> </div>" );

        break;

      case 'dialogue':
        xPos = ((vScript[i].time - currentSceneStart)/currentSceneLength)*wwidth
        xWidth = vScript[i].duration/currentSceneLength*wwidth-1;
        
        yPos = (vSceneCharacterList.indexOf(vScript[i].character.split(" (")[0]))+1;

        if (vMainChars.indexOf(vScript[i].character.split(" (")[0]) == 0) {
          color = "rgba(255,255,200,0.9)"
        } else if (vMainChars.indexOf(vScript[i].character.split(" (")[0]) == 1) {
          color = "rgba(200,255,255,0.9)"
        } else {
          color = "rgba(230,230,230,0.9)"
        }


        $( "#menu-float2" ).append( "<div style='position: absolute; left: " + xPos + "px; top: " + (yPos * 5 +1 )+ "px; width: "+xWidth+"px; background-color: "+color+"; height: 5px; border-radius: 1.5px 2px 2px 1.5px;'> </div>" );

        break;
      case 'parenthetical':
        xPos = ((vScript[i].time - currentSceneStart)/currentSceneLength)*wwidth
        xWidth = vScript[i].duration/currentSceneLength*wwidth-1;
        yPos = (vSceneCharacterList.indexOf(vScript[i].character.split(" (")[0]))+1;

        $( "#menu-float2" ).append( "<div style='position: absolute; left: " + xPos + "px; top: " + (yPos * 5+1 )+ "px; width: "+xWidth+"px; background-color: rgba(255,255,255,0.4); height: 5px; border-radius: 1.5px;'> </div>" );

        break;
    }
    i++;
  }





}



var vPlayState = 0;
var vPlayHeadTime = 0;
var vPlayTimestamp = 0;
var vCurrentScriptIndex = 0;
    var slugLoc = 0

function play() {
  vPlayState = 1;
  vPlayTimestamp = new Date().getTime() - vPlayHeadTime;
  for (var i=0; i<vScript.length; i++) {
    var currentSlug;

    switch (vScript[i].type) {
      case 'scene_heading':
        currentSlug = vScript[i];
        slugLoc = i;
        break;
    }


    if (vPlayHeadTime < vScript[i].time) {
      vCurrentScriptIndex = i-1;
      break;
    }
  }

  if (currentSlug) {
    $("body").css({backgroundColor: "#" + vSceneListColors[currentSlug.text.split(" - ")[0]].color});
    switch (currentSlug.text.split(" - ")[1]) {
                    case 'EARLY EVENING':
                    case 'DUSK':
                    case 'AFTERNOON':
                    case 'PRE-DAWN':
                    case 'LATE AFTERNOON':
                    case 'DAWN':
                      $("#shade").css({background: vTimeGradients["afternoon"]});
                      break;
                    case 'EVENING':
                    case 'NIGHT': 
                    case 'LATE AT NIGHT':
                      $("#shade").css({background: vTimeGradients["night"]});
                      break;
                    case 'MORNING':
                      $("#shade").css({background: vTimeGradients["morning"]});
                      break;
                    case 'DAY':
                    case 'DAYTIME':
                      $("#shade").css({background: vTimeGradients["day"]});
                      break;
    }
    $("#slugline").html(currentSlug.text)

    renderScene(slugLoc);
  }


  console.log("play");
}

function pause(){
  vPlayState = 0;
  console.log("pause");

}


function whatTimeisIt() {
  return (new Date().getTime() - vPlayTimestamp);
}

// requestAnim shim layer by Paul Irish
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
  

// example code from mr doob : http://mrdoob.com/lab/javascript/requestanimationframe/

init();
mainLoop();

function init() {
  // console.log("init");
  if (getParameterByName("time")) {
    vPlayHeadTime = getParameterByName("time");
  }
  play();
}

function mainLoop() {
  requestAnimFrame( mainLoop );
  processScript();
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


function processScript() {
  var wwidth = $( window ).width();
  
  if (vPlayState == 1){
      xPos = Math.floor((whatTimeisIt()/(vScript[vScript.length-1].time+duration))*wwidth)
      $("#playhead").css({left: xPos});
      xPos2 = Math.floor(((whatTimeisIt()-currentSceneStart)/(currentSceneLength))*wwidth)
      $("#playhead2").css({left: xPos2});
      $("#timer").css({left: xPos});

      h = Math.floor(whatTimeisIt()/(60000*60))
      m = Math.floor(whatTimeisIt()/60000)-(h*60)
      s = Math.floor(whatTimeisIt()/1000)-(h*3600)-(m*60)
      ms = Math.floor(whatTimeisIt()/100)-(h*36000)-(m*600)-(s*10)
      timeString = pad(h,1) + ":" + pad(m,2) + ":" + pad(s,2) + ":" + pad(ms,1);


      ttime = vScript[vScript.length-1].time+duration
      h = Math.floor(ttime/(60000*60))
      m = Math.floor(ttime/60000)-(h*60)
      ttimeString = h + " hours " + m + " minutes";

      
      h = Math.floor(currentSceneLength/(60000*60))
      m = Math.floor(currentSceneLength/60000)-(h*60)
      s = Math.floor(currentSceneLength/1000)-(h*3600)-(m*60)
      ms = Math.floor(currentSceneLength/100)-(h*36000)-(m*600)-(s*10)

      tscenelenstring = "[" + pad(m,2) + ":" + pad(s,2) + "]"

      
      $("#timer").html(timeString + " / " + ttimeString + "<br/>page: " + vScript[vCurrentScriptIndex].page + " / " + vPageCount + " <br/>scene: " + vScript[vCurrentScriptIndex].scene+ " " + tscenelenstring) ;

      if (vCurrentScriptIndex < vScript.length) {
        vPlayHeadTime = whatTimeisIt();

        d = Math.floor(vScript[Math.max(vCurrentScriptIndex-1,0)].duration / 1000)+1

        if (vScript[Math.max(vCurrentScriptIndex-1,0)].type == "action"){
          $("#color-speak").css({"-webkit-transition": "background-color 0.3s"})
          $("#color-speak").hide();

        } else {
          $("#color-speak").css({"-webkit-transition": "background-color "+ d+"s"})

        }
        $("#color-speak").css({backgroundColor: "rgba(255,255,200,0.0)"})

        if (whatTimeisIt() > vScript[vCurrentScriptIndex].time) {
          //console.log(vScript[vCurrentScriptIndex].text);

          switch (vScript[vCurrentScriptIndex].type) {
            case 'scene_heading':
              
              // get scene length
              // render scene
              renderScene(vCurrentScriptIndex);

              $("#content").html("")
              $("#slugline").html(vScript[vCurrentScriptIndex].text)
                $("body").css({backgroundColor: "#" + vSceneListColors[vScript[vCurrentScriptIndex].text.split(" - ")[0]].color});
                switch (vScript[vCurrentScriptIndex].text.split(" - ")[1]) {
                    case 'EARLY EVENING':
                    case 'DUSK':
                    case 'AFTERNOON':
                    case 'PRE-DAWN':
                    case 'LATE AFTERNOON':
                    case 'DAWN':
                      $("#shade").css({background: vTimeGradients["afternoon"]});
                      break;
                    case 'EVENING':
                    case 'NIGHT': 
                    case 'LATE AT NIGHT':
                      $("#shade").css({background: vTimeGradients["night"]});
                      break;
                    case 'MORNING':
                      $("#shade").css({background: vTimeGradients["morning"]});
                      break;
                    case 'DAY':
                    case 'DAYTIME':
                      $("#shade").css({background: vTimeGradients["day"]});
                      break;
                  } 
              break;
            case 'action':
              $("#color-speak").css({backgroundColor: "rgba(255,255,200,0.0)"})
              $("#content").html("<br/>" + vScript[vCurrentScriptIndex].text)
              break;
            case 'parenthetical':
              $("#content").html(vScript[vCurrentScriptIndex].character + ":<br/>" + vScript[vCurrentScriptIndex].text)

              if (vMainChars.indexOf(vScript[vCurrentScriptIndex].character.split(" (")[0]) == 0) {
                color = "rgba(255,255,200,0.3)"
              } else if (vMainChars.indexOf(vScript[vCurrentScriptIndex].character.split(" (")[0]) == 1) {
                color = "rgba(200,255,255,0.3)"
              } else {
                color = "rgba(230,230,230,0.1)"
              }
              $("#color-speak").css({"-webkit-transition": "background-color 0.0s"})
              $("#color-speak").css({backgroundColor: color})
              $("#color-speak").show();

              break;
            case 'dialogue':
              $("#content").html(vScript[vCurrentScriptIndex].character + ":<br/>" + vScript[vCurrentScriptIndex].text)

              if (vMainChars.indexOf(vScript[vCurrentScriptIndex].character.split(" (")[0]) == 0) {
                color = "rgba(255,255,200,0.8)"
              } else if (vMainChars.indexOf(vScript[vCurrentScriptIndex].character.split(" (")[0]) == 1) {
                color = "rgba(200,255,255,0.8)"
              } else {
                color = "rgba(230,230,230,0.3)"
              }
              $("#color-speak").css({"-webkit-transition": "background-color 0.0s"})
              $("#color-speak").css({backgroundColor: color})
              $("#color-speak").show();

              break;
            case 'title':
              $("#content").html("<br/>" + vScript[vCurrentScriptIndex].text)
              break;
          }


          vCurrentScriptIndex++;
        }
      }

  }

