loadShare = (key) ->
  url = window.dataUrl + key + '/script.fountain'
  $.ajax(url).success (content) ->
    script.parse(content)
    timeline.init()

window.player = {
  loadShare
}
