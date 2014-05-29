events = require('events')
fountainManager = window.fountainManager

emitter = new events.EventEmitter()

state = 'paused'
recordAtomAt = Date.now()
atom = null

startRecording = ->
  state = 'recording'
  emitter.emit('state:change', state)
  recordAtomAt = Date.now()
  atom = fountainManager.getAtomForCursor()

advance = ->
  # record the time
  duration = Date.now() - recordAtomAt
  fountainManager.setAtomDuration(atom, duration)

  # next atom
  fountainManager.goNext(1)
  newAtom = fountainManager.getAtomForCursor()
  if newAtom.id is atom.id
    stopRecording()
  recordAtomAt = Date.now()
  atom = newAtom

stopRecording = ->
  state = 'paused'
  emitter.emit('state:change', state)

module.exports = {
  startRecording,
  stopRecording,
  advance,
  getState: -> state,
  emitter
}
