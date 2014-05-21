templates = {}

template = (name) ->
  return templates[name]  if templates[name]?
  templates[name] = Handlebars.compile($("##{name}-template").html(), {noEscape: yes})

setText = (text) ->
  $('#current-text').html(template(text.type)(text))

imageUrl = (filename) ->
  IMAGE_URL_BASE + filename + "?" + Math.random()

setImage = (image) ->
  if image
    $('#current-image').attr('src', imageUrl(image.file + "-large.jpeg"))
  else
    $('#current-image').attr('src', '')


setState = (state) ->
  $('#current-state').text(state)
  if state is 'playing'
    $('#bttn-play').hide()
    $('#bttn-pause').show()
  else
    $('#bttn-play').show()
    $('#bttn-pause').hide()

doubleDigit = (v) -> if v < 10 then "0" + v else "" + v

formatTime = (ms) ->
  seconds = Math.floor(ms / 1000)
  minutes = 0
  hours = 0
  if seconds > 60
    minutes = Math.floor(seconds / 60)
    seconds = seconds - minutes * 60
  if minutes > 60
    hours = Math.floor(minutes / 60)
    minutes = minutes - hours * 60
  hours = doubleDigit(hours)
  minutes = doubleDigit(minutes)
  seconds = doubleDigit(seconds)
  return "#{hours}:#{minutes}:#{seconds}"

setTime = (time) ->
  $('#current-time').text(formatTime(time))

setDuration = (duration) ->
  $('#current-duration').text(formatTime(duration))

resizeView = ->
  do (
    toolbarHeight = 50,
    captionHeight = 200,
    canvasSidePadding = 40,
    windowWidth = $(window).width(),
    windowHeight = $(window).height()
  ) ->
    do (canvasDim = [windowWidth, windowHeight - toolbarHeight]) ->
      $(".drawing-canvas").css('width', canvasDim[0])
      $(".drawing-canvas").css('height', canvasDim[1])

      $(".toolbar").css('height', toolbarHeight)
      $(".drawing-canvas .caption").css('height', captionHeight)

      if ((canvasDim[0] - (canvasSidePadding * 2)) / (canvasDim[1] - (canvasSidePadding * 2) - captionHeight)) >= (2.35 / 1)
        do (
          canvasHeight = (canvasDim[1]-(canvasSidePadding*2)-captionHeight),
          canvasWidth = (canvasDim[1]-(canvasSidePadding*2)-captionHeight) * (2.35/1)
        ) ->
          $(".drawing-canvas .canvas, .drawing-canvas img").css('width', canvasWidth)
          $(".drawing-canvas .canvas, .drawing-canvas img").css('height', canvasHeight)

          #$(".drawing-canvas .canvas, .drawing-canvas img").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight)
          #$(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2))

          $(".drawing-canvas .canvas, .drawing-canvas img").css('top', toolbarHeight + canvasSidePadding) #((canvasDim[1] - captionHeight - canvasHeight)/2)-captionHeight+toolbarHeight)
          $(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2))

          $(".drawing-canvas .caption").css('left', ((canvasDim[0] - canvasWidth)/2))
          #$(".drawing-canvas .caption").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight)
          $(".drawing-canvas .caption").css('top', toolbarHeight + canvasSidePadding * 2 + canvasHeight) #((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight)
          $(".drawing-canvas .caption").css('width', canvasWidth)
      else
        do (
          canvasHeight = (windowWidth-(canvasSidePadding*2))*(1/2.35),
          canvasWidth = windowWidth-(canvasSidePadding*2)
        ) ->

          $(".drawing-canvas .canvas, .drawing-canvas img").css('width', canvasWidth)
          $(".drawing-canvas .canvas, .drawing-canvas img").css('height', canvasHeight)

          #$(".drawing-canvas .canvas, .drawing-canvas img").css('top', ((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight)
          $(".drawing-canvas .canvas, .drawing-canvas img").css('top', toolbarHeight + canvasSidePadding) #canvasDim[1] - captionHeight((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight)
          $(".drawing-canvas .canvas, .drawing-canvas img").css('left', ((canvasDim[0] - canvasWidth)/2))

          $(".drawing-canvas .caption").css('left', ((canvasDim[0] - canvasWidth)/2))
          $(".drawing-canvas .caption").css('top', toolbarHeight + canvasSidePadding * 2 + canvasHeight) #((canvasDim[1] - canvasHeight)/2)-captionHeight+toolbarHeight+canvasHeight)
          $(".drawing-canvas .caption").css('width', canvasWidth)

$(document).ready ->
  resizeView()

$(window).resize(resizeView)

$('#bttn-play').click ->
  playstate.play()

$('#bttn-pause').click ->
  playstate.pause()

$('#bttn-back').click ->
  playstate.setPlayhead(0)

window.display = {
  setState,
  setTime,
  setDuration,
  setImage,
  setText
}
