pageloadAt = Date.now()
templates = {}
totalDuration = 1
currentState = 'paused'

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
  digits = 1
  digits += 1  if seconds > 9
  digits += 1  if minutes > 0
  digits += 1  if minutes > 9
  digits += 1  if hours > 0
  digits += 1  if hours > 9
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

setTime = (time) ->
  $('#current-time').text(formatTime(time))
  $('.playhead-time').text(formatTime(time))
  width = Math.ceil((time / totalDuration) * $('.scrubber').width())
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
    return  if Date.now() - wasDraggingAt < 100
    do (x = e.pageX - $(this).offset().left,
        width = $('.scrubber').width()) ->
      timeline.setPlayhead(x / width * totalDuration)
      setTime(x / width * totalDuration)

  wasDraggingAt = Date.now()
  lastUpdateAt = Date.now()
  wasPlaying = no
  lastDragTime = 0

  updateWhileDragging = ->
    return  unless dragging
    do (x = $('.current-location').offset().left + 5,
        width = $('.scrubber').width()) ->
      if Math.abs(lastDragTime - x / width * totalDuration) > 1
        timeline.setPlayhead(x / width * totalDuration)
    setTimeout updateWhileDragging, 100

  $('.current-location').draggable({
    axis: 'x', 
    containment: '.dragger-container',
    scroll: no,
    start: (e) ->
      console.log 'start current location drag'
      wasPlaying = currentState is 'playing'
      timeline.pause()
      lastDragTime = timeline.getPlayhead()
      dragging = yes
      updateWhileDragging()
    drag: ->
      console.log 'drag'
      do (x = $('.current-location').offset().left + 5,
          width = $('.scrubber').width()) ->
        if Date.now() - lastUpdateAt > 100
          timeline.setPlayhead(x / width * totalDuration)
        setTime(x / width * totalDuration)
      lastUpdateAt = Date.now()
    stop: ->
      console.log 'dragstop'
      do (x = $('.current-location').offset().left + 5,
          width = $('.scrubber').width()) ->
        timeline.setPlayhead(x / width * totalDuration)
      dragging = no
      timeline.play()  if wasPlaying
      wasDraggingAt = Date.now()
  })

  cancelGoAway = no

  $('.control-bar-container').mouseover ->
    cancelGoAway = yes
    if $('.control-bar').hasClass('off')
      $('.control-bar').removeClass('off')

  goaway = ->
    return  if dragging
    return  if cancelGoAway
    unless $('.control-bar').hasClass('off')
      $('.control-bar').addClass('off')

  $('.control-bar-container').mouseout ->
    return  if dragging
    cancelGoAway = no
    setTimeout goaway, 3000

  setTimeout goaway, 3000
  setInterval updatePlayhead, 250

  $(window).blur ->
    cancelGoAway = yes
    $('.control-bar').removeClass('off')

  $(window).focus ->
    $('.control-bar').removeClass('off')
    return  if dragging
    cancelGoAway = no
    setTimeout goaway, 1000

  $(window).keydown (e) ->
    switch e.which
      when 32  # space
        if currentState is 'playing'
          timeline.pause()
        else
          timeline.play()

window.display = {
  setState,
  setTime,
  setDuration,
  setImage,
  setImageText,
  setText
}
