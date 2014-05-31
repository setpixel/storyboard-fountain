events = require('events')

emitter = new events.EventEmitter()
aspectRatio = window.getSetting('aspect-ratio', 2.35)

setAspectRatio = (ratio) ->
  return  if aspectRatio is ratio
  oldRatio = aspectRatio
  aspectRatio = ratio
  window.localStorage.setItem('aspect-ratio', ratio)
  emitter.emit('aspectRatio:change', ratio, oldRatio)

getAspectRatio = -> aspectRatio

module.exports = {
  setAspectRatio,
  getAspectRatio,
  emitter
}
