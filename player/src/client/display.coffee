pageloadAt = Date.now()
templates = {}
totalDuration = 1
currentState = 'paused'
aspectRatio = 2.35

setAspectRatio = (ratio) ->
  aspectRatio = ratio
  resizeView()
 
template = (name) ->
  return templates[name]  if templates[name]?
  templates[name] = Handlebars.compile($("##{name}-template").html(), {noEscape: yes})

setText = (text) ->
  $('#current-text').html(template(text.type)(text))

imageUrl = (filename) -> 
  window.dataUrl + window.key + "/images/" + filename + "?" + pageloadAt

setImage = (image) ->
  if image
    $('#current-image').attr('src', imageUrl(image.file + "-large.jpeg"))
  else
    $('#current-image').attr('src', '')

$(document).ready ->
  $.fn.verticalAlign = ->
    do (top = Math.floor(($(this).parent().height() - $(this).height()) / 2)) =>
      this.css("margin-top", top + 'px')
      console.log('verticalAlign', top, this.css('margin-top'))

setImageText = (text) ->
  text ?= ''
  $('#current-image-text').html(text).verticalAlign()

setState = (state) ->
  currentState = state
  $('#current-state').text(state)
  if state is 'playing'
    $('#bttn-play').hide()
    $('#bttn-pause').show()

    $('.state-playing').hide()
    $('.state-paused').show()
  else
    $('#bttn-play').show()
    $('#bttn-pause').hide()

    $('.state-playing').show()
    $('.state-paused').hide()

doubleDigit = (v) -> if v < 10 then "0" + v else "" + v

timeDigits = (ms) ->
  seconds = Math.floor(ms / 1000)
  minutes = 0
  hours = 0
  if seconds > 60
    minutes = Math.floor(seconds / 60)
    seconds = seconds - minutes * 60
  if minutes > 60
    hours = Math.floor(minutes / 60)
    minutes = minutes - hours * 60
  if hours > 9
    digits = 6
  else if hours > 0
    digits = 5
  else if minutes > 9
    digits = 4
  else
    digits = 3
  return digits

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
  maxDigits = timeDigits(totalDuration)
  if maxDigits > 4
    hours = doubleDigit(hours)  if maxDigits > 5
    hoursOut = "#{hours}:"
  else
    hoursOut = ''
  minutes = doubleDigit(minutes)  if maxDigits > 3
  seconds = doubleDigit(seconds)  if maxDigits > 1
  return hoursOut + "#{minutes}:#{seconds}"

scrubberWidth = -> $('.scrubber').width() - 10
xToTime = (x) -> (x - 5) / (scrubberWidth() - 5) * totalDuration

setTime = (time) ->
  $('#current-time').text(formatTime(time))
  $('.playhead-time').text(formatTime(time))
  width = Math.ceil((time / totalDuration) * scrubberWidth())
  $('.playhead-bar').css('width', width + 'px')
  unless dragging
    $('.current-location').css('left', (width - 5) + 'px')

setDuration = (duration) ->
  totalDuration = duration
  $('#current-duration').text(formatTime(duration))
  $('.duration').text(formatTime(duration))

resizeView = ->
  do (
    toolbarHeight = 0,
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

      if ((canvasDim[0] - (canvasSidePadding * 2)) / (canvasDim[1] - (canvasSidePadding * 2) - captionHeight)) >= aspectRatio
        do (
          canvasHeight = (canvasDim[1]-(canvasSidePadding*2)-captionHeight),
          canvasWidth = (canvasDim[1]-(canvasSidePadding*2)-captionHeight) * aspectRatio
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
          canvasHeight = (windowWidth-(canvasSidePadding*2)) / aspectRatio,
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

wasLastPlaying = no
dragging = no

updatePlayhead = ->
  return  if dragging
  setTime(timeline.getPlayhead())

useMono = yes
setFont = (mono) ->
  useMono = mono
  if mono
    $('.caption, #current-image-text').addClass('mono-font')
    $('.caption, #current-image-text').removeClass('nonmono-font')
  else
    $('.caption, #current-image-text').addClass('nonmono-font')
    $('.caption, #current-image-text').removeClass('mono-font')

$(document).ready ->
  resizeView()

  $(window).resize(resizeView)

  setFont(yes)

  $('.font-button').click ->
    setFont(not useMono)

  $('.play-button').click ->
    if currentState is 'paused'
      timeline.play()
    else
      timeline.pause()

  $('.scrubber').mousedown (e) ->
    console.log('scrubberNOW')
    return  if Date.now() - wasDraggingAt < 100
    do (time = xToTime(e.pageX - $(this).offset().left)) ->
      timeline.setPlayhead(time)
      setTime(time)

  wasDraggingAt = Date.now()
  lastUpdateAt = Date.now()
  wasPlaying = no
  lastDragTime = 0

  updateWhileDragging = ->
    return  unless dragging
    do (time = xToTime($('.current-location').offset().left + 5)) ->
      if Math.abs(lastDragTime - time) > 1
        timeline.setPlayhead(time)
    setTimeout updateWhileDragging, 100

  $('.current-location').draggable({
    axis: 'x', 
    containment: '.dragger-container',
    scroll: no,
    cursor: 'pointer',
    start: (e) ->
      e.stopImmediatePropagation()
      console.log 'start current location drag'
      wasPlaying = currentState is 'playing'
      timeline.pause()
      lastDragTime = timeline.getPlayhead()
      dragging = yes
      updateWhileDragging()
    drag: ->
      console.log 'drag'
      do (time = xToTime($('.current-location').offset().left + 5)) ->
        if Date.now() - lastUpdateAt > 100
          timeline.setPlayhead(time)
        setTime(time)
      lastUpdateAt = Date.now()
    stop: ->
      console.log 'dragstop'
      do (time = xToTime($('.current-location').offset().left + 5)) ->
        timeline.setPlayhead(time)
      dragging = no
      timeline.play()  if wasPlaying
      wasDraggingAt = Date.now()
  })

  cancelGoAway = no

  $('.control-bar-container').mouseover ->
    cancelGoAway = yes
    if $('.control-bar').hasClass('off')
      $('.control-bar').removeClass('off')

  lastActionAt = Date.now()
  goaway = ->
    return  if dragging
    return  if cancelGoAway
    timeLeft = 3000 - (Date.now() - lastActionAt)
    if timeLeft <= 0
      unless $('.control-bar').hasClass('off')
        $('.control-bar').addClass('off')
    else
      setTimeout goaway, timeLeft

  $('.control-bar-container').mouseout ->
    lastActionAt = Date.now()
    return  if dragging
    cancelGoAway = no
    setTimeout goaway, 3000

  setTimeout goaway, 3000
  setInterval updatePlayhead, 250

  $(window).blur ->
    cancelGoAway = yes
    $('.control-bar').removeClass('off')

  $(window).focus -> showControls()

  $(window).mousemove -> showControls()

  showControls = ->
    lastActionAt = Date.now()
    $('.control-bar').removeClass('off')
    return  if dragging
    cancelGoAway = no
    setTimeout goaway, 3000

  $(window).keydown (e) ->
    switch e.which
      when 32  # space
        if currentState is 'playing'
          timeline.pause()
        else
          timeline.play()
        showControls()

window.display = {
  setAspectRatio,
  setState,
  setTime,
  setDuration,
  setImage,
  setImageText,
  setText
}
