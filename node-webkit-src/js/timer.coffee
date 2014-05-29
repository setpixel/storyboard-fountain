TO_RADIANS = Math.PI / 180
$ = window.$

$circle = null
$text = null
canvas = null
context = null
duration = 0

init = (circle, text) ->
  $circle = circle
  $text = text
  canvas = window.document.createElement('canvas')
  canvas.width = $circle.width()
  canvas.height = $circle.height()
  $circle.append($(canvas))
  context = canvas.getContext('2d')

setDuration = (ms) ->
  duration = ms
  $text.text((duration / 1000).toFixed(1))

setTimeLeft = (ms) ->
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  do (centerX = Math.floor(canvas.width / 2),
      centerY = Math.floor(canvas.height / 2),
      radius = Math.floor(canvas.width / 2),
      startAngle = -.5 * Math.PI,
      endAngle = 1.5 * Math.PI + (1 - ms / duration) * 360 * TO_RADIANS
  ) ->
    console.log('setTimeLeft', ms, endAngle)
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.arc(centerX, centerY, radius, startAngle, endAngle, yes)
    context.closePath()
    context.fillStyle = 'rgba(255, 255, 255, 0.5)'
    context.fill()
  context.restore()

startAt = null
state = 'paused'

play = ->
  do (startedAt = Date.now()) ->
    startAt = startedAt
    state = 'playing'
    continuePlaying = ->
      return  unless startedAt is startAt
      return  unless state is 'playing'
      do (playerState = window.player.getFullState(), timeLeft = 0) ->
        timeLeft = playerState.updateTimeLeft - (Date.now() - playerState.updateTimeAt)
        timeLeft = Math.max(0, timeLeft)
        if timeLeft <= 0
          setTimeLeft(0)
          pause()
        else
          window.requestAnimationFrame(continuePlaying)
          setTimeLeft(timeLeft)
    window.requestAnimationFrame(continuePlaying)
    continuePlaying()

pause = ->
  state = 'paused'
  setTimeLeft(duration * 0.75)

module.exports = {
  init,
  setDuration,
  setTimeLeft,
  play,
  pause
}
