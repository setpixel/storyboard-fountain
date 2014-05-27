updates = []
scriptDuration = 0

buildUpdates = ->
  atomDuration = (atom) ->
    atom.duration or 1000

  do (buildingImages = no, duration = 0, time = 0, text = {}, images = []) ->
    # set the current state for the text and images
    script.atoms 0, (atom, index) ->
      duration = atomDuration(atom)
      console.log('atom duration:', duration, ' type:', atom.type)

      addUpdates = ->
        if buildingImages
          for image in images
            do (duration = image.duration) ->
              updates.push {
                time, 
                duration, 
                state: {text, image}
              }
              time += duration
        else
          do (duration = text.duration) ->
            updates.push {
              time, 
              duration, 
              state: {text, image: images[0]}
            }
            time += duration

      switch atom.type

        when 'title'
          text = {type: 'title', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'transition'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'transition', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'action'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'action', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'dialogue'
          text = {type: 'dialogue', texts: [], duration: 0}  unless text.type is 'dialogue' and atom.dual
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          else
            text.duration += duration
          text.texts.push {character: atom.character, text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'parenthetical'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'parenthetical', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'image'
          images = []  unless buildingImages
          buildingImages = yes
          images.push {file: atom.file, duration}
          console.log('images.length:', images.length)
          text = {}

        when 'scene_heading'
          text = {}
          images = []
          buildingImages = no
          duration = 0

        else
          duration = 0

      return yes
  scriptDuration = updates[updates.length - 1].time + updates[updates.length - 1].duration

state = 'paused'
# used when paused
playheadTime = 0
# used when playing
startTime = 0
startAt = Date.now()

updateIndex = 0
done = no

update = -> updates[updateIndex]

show = ->
  do ({image, text} = update().state) ->
    if image?
      display.setImage(image)
      display.setImageText()
    else
      display.setImage()
      display.setImageText('[NO IMAGE]')
    switch text.type
      when 'title'
        display.setText(text)
        display.setImageText(text.text)
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

play = ->
  do (startedAt = Date.now()) ->
    state = 'playing'
    display.setState(state)
    startAt = startedAt
    startTime = playheadTime
    continuePlaying = ->
      return  unless startAt is startedAt  # we are being called for an old call to "play"
      return  unless state is 'playing'  # we are no longer playing
      updateTime = (Date.now() - startAt) + startTime
      while updateTime >= update().time + update().duration
        if updates.length > updateIndex + 1
          updateIndex += 1
        else
          done = yes
          pause()
          break
      show()
      display.setTime(getPlayhead())
      unless done
        do (timeLeft = update().time + update().duration - updateTime) ->
          setTimeout continuePlaying, timeLeft
    continuePlaying()

pause = ->
  state = 'paused'
  playheadTime = (Date.now() - startAt) + startTime
  display.setState(state)
  display.setTime(getPlayhead())

setPlayhead = (time) ->
  time = Math.max(0, Math.min(scriptDuration, time))
  updateIndex = 0
  done = no
  while time >= update().time + update().duration
    if updates.length > updateIndex + 1
      updateIndex += 1
    else
      done = yes
      state = 'paused'
      break
  playheadTime = time
  if state is 'playing'
    play()  
  else
    show()

init = ->
  buildUpdates()
  setPlayhead(0)
  display.setState(state)
  display.setTime(getPlayhead())
  display.setDuration(scriptDuration)

getPlayhead = ->
  if state is 'playing'
    (Date.now() - startAt) + startTime
  else
    playheadTime

window.timeline = {
  init,
  play,
  pause,
  setPlayhead,
  getPlayhead
}
