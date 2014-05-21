atomIndex = 0  # the index of the atom we want to look at next in the script
currentTime = 0  # the time accumulated so far in processing atoms
text = {}  # the current text to display
images = []  # the current image (and future images in the current collection) to display
timeLeft = 0  # the time needed until the next update
done = no  # are we done processing the script?

atomDuration = (atom) ->
  atom.duration or 1000

update = (time) ->
  console.log('update() time:', time)
  do (buildingImages = no, duration = 0) ->
    # if we need to update the state to later in the script
    if currentTime <= time
      # set the current state for the text and images
      {atomIndex, done} = script.atoms atomIndex, (atom, index) ->
        duration = atomDuration(atom)
        console.log('atom duration:', duration, ' type:', atom.type)
        switch atom.type
          when 'title'
            console.log('atom is title. setting text')
            text = {type: 'title', text: atom.text, duration, time: currentTime}
            buildingImages = no

          when 'transition'
            console.log('atom is transition. setting text')
            text = {type: 'transition', text: atom.text, duration, time: currentTime}
            buildingImages = no

          when 'action'
            console.log('atom is action. setting text')
            text = {type: 'action', text: atom.text, duration, time: currentTime}
            buildingImages = no

          when 'dialogue'
            console.log('atom is dialogue. setting text')
            text = {type: 'dialogue', texts: [], duration: 0, time: currentTime}  unless text.type is 'dialogue' and atom.dual
            if buildingImages  # if we were just adding images, ignore this duration
              duration = 0
            else
              text.duration += duration
            text.texts.push {character: atom.character, text: atom.text, duration, time: currentTime}
            console.log('duration:', text.duration, ' texts.length:', text.texts.length)
            buildingImages = no

          when 'parenthetical'
            console.log('atom is parenthetical. setting text')
            text = {type: 'parenthetical', text: atom.text, duration, time: currentTime}
            buildingImages = no

          when 'image'
            console.log('atom is image. setting image')
            images = []  unless buildingImages
            buildingImages = yes
            images.push {file: atom.file, duration, time: currentTime}
            console.log('images.length:', images.length)
            text = {}

          else
            duration = 0

        currentTime += duration
        console.log('currentTime:', currentTime)

        doAnother = buildingImages or currentTime <= time
        console.log('doAnother? buildingImages', buildingImages, ' currenttime <= time', currentTime <= time, currentTime, time)
        return doAnother
      
    # remove images that have already passed
    do (index = null) ->
      for image, i in images by -1
        if image.time <= time
          console.log('removing images before index:', i)
          index = i
          break
      images = images.slice(index)  if index?

    # find the next change time
    if images.length > 0
      timeLeft = images[0].time + images[0].duration - time
    else
      timeLeft = text.time + text.duration - time
    console.log('timeLeft:', timeLeft)

show = ->
  if images.length > 0
    display.setImage(images[0])
  else
    display.setImage()
  switch text.type
    when 'title'
      display.setText(text)
    when 'transition'
      display.setText(text)
    when 'action'
      display.setText(text)
    when 'dialogue'
      display.setText(text)
    when 'parenthetical'
      display.setText(text)
    else
      display.setText('')

startAt = Date.now()
startTime = 0
lastTime = 0
lastTimeAt = 0
state = 'paused'

setPlayhead = (time) ->
  # reset the update params
  atomIndex = 0
  currentTime = 0
  text = {}
  images = []
  timeLeft = 0
  done = no

  # set the playhead
  startTime = time
  display.setTime(startTime)
  lastTime = time
  lastTimeAt = Date.now()

  if state is 'playing'
    play()  
  else
    update(startTime)
    show()

play = ->
  do (startedAt = Date.now()) ->
    state = 'playing'
    display.setState('playing')
    startAt = startedAt
    continuePlaying = ->
      console.log('continuePlaying() check1', startAt is startedAt, ' check2', state is 'playing', ' check3', done)
      return  unless startAt is startedAt  # we are being called for an old call to "play"
      return  unless state is 'playing'  # we are paused
      if done  # we are done playing the script
        state = 'paused'
        display.setState('paused')
        return
      lastTime = Date.now() - startAt + startTime  # time since started playing
      lastTimeAt = Date.now()
      console.log('lastTime:', lastTime)
      update(lastTime)
      show()
      if timeLeft >= 0
        setTimeout continuePlaying, timeLeft
      else
        done = yes
    continuePlaying()

pause = ->
  if state is 'playing'
    lastTime = Date.now() - startAt + startTime
    lastTimeAt = Date.now()
    update(lastTime)
    startTime = lastTime
  state = 'paused'
  display.setState('paused')

updateTime = ->
  if state is 'playing'
    do (sec = Date.now() - lastTimeAt + lastTime) ->
      console.log('calling setTime', sec)
      display.setTime(sec)
  else
    display.setTime(lastTime)

init = ->
  display.setState(state)
  display.setTime(lastTime)
  display.setDuration(script.getDuration())
  setInterval(updateTime, 1000)
  setPlayhead(0)

window.playstate = {
  init,
  play,
  pause,
  setPlayhead
}
