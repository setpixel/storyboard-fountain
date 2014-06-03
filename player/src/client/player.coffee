loadShare = (key) ->
  url = window.dataUrl + key + '/script.fountain'
  $.ajax(url).success (content) ->
    script.parse(content)
    display.setAspectRatio(script.getAspectRatio())
    timeline.init()

window.player = {
  loadShare
}
