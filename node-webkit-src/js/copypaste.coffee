$ = window.$
document = window.document
streamBuffers = require('stream-buffers')

# external tool to interface with the osx pasteboard
toolPath = __dirname + '/../tools/sfpasteboard'

###
used to keep copies of layers that have been "copied" to the pasteboard. really
it's just an id that is copied to the pasteboard and is found when we do a paste
### 
copies = {}
createCopy = ->
  layers = window.sketchpane.copy()
  if layers?
    id = '' + Date.now()
    copies = {}
    copies[id] = layers.slice(0)
    return id
  else
    return null

###
check with an external program to see if an id of ours is in the current 
pasteboard item. if it's there, pass to next
###
checkPaste = (next) ->
  spawn = require('child_process').spawn
  child = spawn(toolPath, [])

  tmp = new Uint8Array(0).buffer
  child.stdout.on 'data', (data) ->
    data = new Uint8Array(data)
    tmp2 = new Uint8Array(tmp.byteLength + data.byteLength)
    tmp2.set(new Uint8Array(tmp), 0)
    tmp2.set(new Uint8Array(data), tmp.byteLength)
    tmp = tmp2

  uintToString = (uintArray) ->
    encodedString = String.fromCharCode.apply(null, uintArray)
    decodedString = decodeURIComponent(escape(encodedString))
    return decodedString

  child.on 'close', (code) ->
    #console.log('child process exited with code ' + code)
    return next(null)  unless tmp.byteLength
    
    view = new window.DataView(tmp.buffer)
    length = view.getUint32(0, true)
    id = uintToString(new Uint8Array(tmp.buffer.slice(8, 8 + length)))
    #console.log('id', id)

    if id is '1' or id is 'NOID' or !copies[id]
      next(null)
    else
      next(id)

isInputElement = (el) ->
  return no  unless el
  switch el.nodeName
    when 'INPUT'
      el.type in ['text', 'password']
    when 'TEXTAREA'
      yes
    else
      no

# determine if the copy/paste should be handled for boards
boardIsFocus = (action) ->
  # if we are not on the boards tab, nope
  return no  if window.ui.getActiveState() isnt 'boards'
  # if we want to copy and something else is selected, nope
  return no  if action is 'copy' and window.getSelection().type isnt 'None'
  # if we are active on an input element, nope
  return no  if isInputElement(window.activeElement)
  return yes

###
paste

either paste an external image or paste in the saved layers from a local app 
copy. a hack, but works fine for now
###
window.document.onpaste = (event) ->
  return  unless boardIsFocus('paste')
  event.preventDefault()
  items = (event.clipboardData ? event.originalEvent.clipboardData).items
  #console.log('clipboard', JSON.stringify(items))  # will give you the mime types
  for item in items
    if item.type.match(/^image\//)
      do (url = window.URL.createObjectURL(item.getAsFile())) ->
        checkPaste (id) ->
          #console.log('PASTE ID', id)
          if id
            window.sketchpane.paste(copies[id])
          else
            do (img = new window.Image()) ->
              img.onload = -> 
                window.sketchpane.pasteImage(img)
                window.URL.revokeObjectURL(url)
              img.src = url

    ###
    it seems like this should work, but it doesn't. not sure why. keeping code
    around to investigate in the future. in this case, we stream not only the id
    but the image data from the pasteboard from the external program back here
    and then load it up. we must be reading it incorrectly, b/c the image onload
    handler is never called.

    #base64 = tmp.buffer.slice(8 + length).toString('base64')
    buffer = new window.Buffer( tmp )
    require('fs').writeFile __dirname + '/test.png', buffer, ->

    bb = new window.Blob([buffer], {type: 'image/png'})
    url = window.URL.createObjectURL(bb)
    $img = $('<img>').attr('src', url)
    window.document.body.appendChild($img[0])
    img = new window.Image()
    img.onload = -> 
      window.sketchpane.pasteImage(img)
      #window.URL.revokeObjectURL(img.src)
    img.src = url
    return false
    ###

###
copy

this is a hack. we stream our image (and custom id) to an external program
to paste it to the clipboard correctly (the custom id is associated with it
so we know it is our image if it is pasted back to us)
###
window.document.oncopy = (event) ->
  return  unless boardIsFocus('copy')
  event?.preventDefault()
  do (image64 = window.sketchpane.getFlatImage()[0]) ->
    image = image64.replace('data:image/jpeg;base64,', '')
    buf = new window.Buffer(image, 'base64')
    reader = new streamBuffers.ReadableStreamBuffer()
    spawn = require('child_process').spawn
    id = createCopy() ? 1
    #console.log('COPY ID', id)
    child = spawn(toolPath, [id])
    reader.pipe(child.stdin)
    reader.put(buf)
