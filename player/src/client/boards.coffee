pageloadAt = Date.now()
shareKey = ''

loadShare = (key) ->
  shareKey = key
  url = window.dataUrl + key + '/script.fountain'
  $.ajax(url).success (content) ->
    script.parse(content)
    updates.buildUpdates()
    show()
    $('.board .text-container > div').click (e) ->
      $('.mynotes[data-item="' + $(this).attr('data-item') + '"]').toggle().focus()
    $('.mynotes').blur (e) ->
      itemKey = key + ':' + 'item:' + $(this).attr('data-item') + ':notes'
      localStorage.setItem(itemKey, $(this).val())

window.boards = {
  loadShare
}

show = ->
  $('#title').html(script.getTitle())
  index = 1
  for update in updates.getUpdates()
    continue  if update.state.text.type is 'title'
    $('#boards').append(renderUpdate(update, index))
    index += 1

renderUpdate = (update, index) ->
  opts = {index}

  itemKey = shareKey + ':' + 'item:' + index + ':notes'
  opts.mynote = localStorage.getItem(itemKey) ? ''
  opts.mynotesstyle = if opts.mynote then '' else 'display: none;'

  opts.notes = "##{index}. duration: #{(update.duration / 1000).toFixed(1)}sec"
  do ({image, text} = update.state) ->
    if image?
      opts.image_src = imageUrl(image.file + "-large.jpeg")
      opts.image_alt = ''
    else
      opts.image_src = ''
      opts.image_alt = '[NO IMAGE]'
    switch text.type
      when 'transition'
        opts.caption = text.text
      when 'action'
        opts.caption = text.text
      when 'dialogue'
        opts.caption = template(text.type)(text)
      when 'parenthetical'
        opts.caption = text.text
      else
        opts.caption = ''
  $board = $('<div>')
  $board.html(template('board')(opts))
  return $board

templates = {}

template = (name) ->
  return templates[name]  if templates[name]?
  templates[name] = Handlebars.compile($("##{name}-template").html(), {noEscape: yes})

imageUrl = (filename) -> 
  window.dataUrl + window.key + "/images/" + filename + "?" + pageloadAt

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


$(document).ready ->
  #resizeView()

  #$(window).resize(resizeView)

  #setFont(yes)
