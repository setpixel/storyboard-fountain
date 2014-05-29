events = require('events')
timeline = window.timeline

emitter = new events.EventEmitter()
state = 'paused'
# used when paused
playheadTime = 0
# used when playing
startTime = 0
startAt = Date.now()

updateIndex = 0
updateTimeLeft = 0
updateTimeAt = Date.now()
done = no

update = -> window.timeline.updates()[updateIndex]

show = ->
  do ({chunkIndex, boardIndex} = window.fountainManager.getCursorForAtom(update().atomId)) ->
    if chunkIndex?
      window.fountainManager.selectChunkAndBoard(chunkIndex, boardIndex)
    else
      console.log('show: invalid chunk', updateIndex, update().atomId, chunkIndex, boardIndex)

play = ->
  do (startedAt = Date.now()) ->
    state = 'playing'
    emitter.emit('state:change', state)
    startAt = startedAt
    _atom = window.fountainManager.getAtomForCursor()
    console.log('atom', _atom)
    _update = window.timeline.getUpdateForAtom(_atom)
    console.log('update', _update)
    updateIndex = _update.index
    startTime = update().time
    continuePlaying = ->
      return  unless startAt is startedAt  # we are being called for an old call to "play"
      return  unless state is 'playing'  # we are no longer playing
      updateTime = (Date.now() - startAt) + startTime
      while updateTime >= update().time + update().duration
        if window.timeline.updates().length > updateIndex + 1
          updateIndex += 1
        else
          done = yes
          pause()
          break
      show()
      unless done
        do (timeLeft = update().time + update().duration - updateTime) ->
          updateTimeLeft = timeLeft
          updateTimeAt = Date.now()
          setTimeout continuePlaying, timeLeft
    continuePlaying()

pause = ->
  state = 'paused'
  playheadTime = (Date.now() - startAt) + startTime
  emitter.emit 'state:change', state

setPlayhead = (time) ->
  time = Math.max(0, Math.min(timeline.scriptDuration, time))
  updateIndex = 0
  done = no
  while time >= update().time + update().duration
    if window.timeline.updates().length > updateIndex + 1
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
  emitter.emit 'state:change', state

toggleState = ->
  if state is 'playing'
    pause()
  else
    play()

getFullState = -> {state, updateIndex, updateTimeLeft, updateTimeAt}

module.exports = {
  init,
  play,
  pause,
  toggleState,
  setPlayhead,
  emitter,
  getFullState
}
