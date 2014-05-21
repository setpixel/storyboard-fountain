loadShare = (key) ->
  url = window.dataUrl + key + '/script.fountain'
  $.ajax(url).success (content) ->
    script.parse(content)
    playstate.init()

window.player = {
  loadShare
}
