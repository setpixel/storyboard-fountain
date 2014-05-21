tokens = ''
script = []
duration = 0
vScenes = {}
vSceneList = []
vSceneCount = 0
vSceneListColors = {}
vUniqueCount = 0
imageList = []

parseFountain = (fountainText) ->
  tokens = ''
  fountain.parse fountainText, yes, (output) ->
    tokens = output.tokens
  createScript()
  calcDuration()
  getUniqueLocations()
  createScriptChunks()

durationOfWords = (text, durationPerWord) ->
  text.split(" ").length * durationPerWord

parseNote = (string) ->
  do (metadata = {}, chunks = string.split(',')) ->
    return no  if chunks.length is 1
    for chunk in chunks
      do ([key, value] = chunk.split(':')) ->
        return no  unless value?
        metadata[key.trim()] = value.trim()
    return metadata

createScript = ->
  do (
    currentTime = 0, 
    vCurrentCharacter = '',
    sceneCounter = 0,
    inDualDialogue = 0,
    inDialogue = 0
  ) ->
    script = []

    for token, index in tokens
      console.log(token)

      addAtom = (opts) ->
        do (atom = null) ->
          atom = _.extend {
            time: currentTime
            duration: 0
            type: token.type
            text: token.text
            scene: sceneCounter
            page: token.page
            tempIndex: index
          }, opts
          script.push atom
          currentTime += atom.duration
          return atom

      switch token.type
        when 'title'
          addAtom {duration: 2000}

        when 'credit', 'author', 'source', 'draft_date', 'contact'
          addAtom {}

        when 'scene_heading'
          sceneCounter++
          addAtom {}

        when 'action'
          duration = durationOfWords(token.text, 200) + 500
          addAtom {duration}

        when 'dialogue_begin'
          inDialogue = 1
          inDualDialogue++  if inDualDialogue

        when 'dual_dialogue_begin'
          inDialogue = 1
          inDualDialogue = 1

        when 'character'
          currentCharacter = token.text

        when 'parenthetical'
          duration = durationOfWords(token.text, 300) + 1000
          atom = addAtom {duration, character: currentCharacter}
          atom.dual = 1  if inDualDialogue is 3

        when 'dialogue'
          duration = durationOfWords(token.text, 300) + 1000
          atom = addAtom {duration, character: currentCharacter}
          atom.dual = 1  if inDualDialogue is 3

        when 'dialogue_end'
          inDialogue = 0

        when 'dual_dialogue_end'
          inDialogue = 0
          inDualDialogue = 0

        when 'centered'
          addAtom {duration: 2000}

        when 'transition'
          addAtom {}

        when 'section'
          addAtom {depth: token.depth}

        when 'synopsis'
          addAtom {}

        when 'note'
          do (metadata = parseNote(token.text)) ->
            if metadata
              atom = addAtom {type: 'image', file: metadata.file, time: metadata.time}
              atom.caption = metadata.caption  if metadata.caption
            else
              addAtom {}

    duration = currentTime
    console.log('script duration:', duration)

calcDuration = ->
  duration = 0
  do (buildingImage = no) ->
    for atom in script
      add = -> duration += if atom.duration is 0 then 1000 else atom.duration

      switch atom.type
        when 'title', 'action', 'parenthetical', 'transition'
          buildingImage = no
          add()
        when 'dialogue'
          if buildingImage
            buildingImage = no
          else
            add()
        when 'image'
          buildingImage = yes
          add()

vColors = ["6dcff6", "f69679", "00bff3", "f26c4f", "fff799", "c4df9b", "f49ac1", "8393ca", "82ca9c", "f5989d", "605ca8", "a3d39c", "fbaf5d", "fff568", "3cb878", "fdc689", "5674b9", "8781bd", "7da7d9", "a186be", "acd373", "7accc8", "1cbbb4", "f9ad81", "bd8cbf", "7cc576", "f68e56", "448ccb"]

getUniqueLocations = ->
  vScenes = {}
  vSceneList = []
  vSceneCount = 0
  vSceneListColors = {}
  vUniqueCount = 0

  for atom in script
    if atom.type is 'scene_heading'
      vSceneCount++
      do (name = atom.text.split(" - ")[0]) ->
        if vScenes.hasOwnProperty(name)
          vScenes[name] += 1
        else
          vUniqueCount++
          vScenes[name] = 1;
          vSceneList.push(name)
          vSceneListColors[name] = {
            color: vColors[vUniqueCount % vColors.length]
          }

createScriptChunks = ->
  do (objects = [], imageCollection = null, shots = 0) ->
    for atom, index in script
      switch atom.type
        when 'scene_heading'
          atom.scriptIndex = index
          objects.push atom

        when 'action'
          shots++
          atom.scriptIndex = index
          if imageCollection
            atom.images = imageCollection
            imageCollection = null
          objects.push atom

        when 'parenthetical'
          shots++
          atom.scriptIndex = index
          if imageCollection
            atom.images = imageCollection
            imageCollection = null
          objects.push atom

        when 'dialogue'
          shots++
          atom.scriptIndex = index
          if imageCollection
            atom.images = imageCollection
            imageCollection = null
          objects.push atom

        when 'image'
          imageCollection ?= []
          imageCollection.push [atom, atom.tempIndex]
          imageList.push [atom, index]

    scriptChunks = objects

getAtom = (index) ->
  script[index]

atoms = (index, callback) ->
  console.log('atoms() checking index:', index)
  while index < script.length and callback(script[index], index)
    index++
    console.log('atoms() checking index:', index)
  index++
  console.log('atoms() returning atomIndex:', index, ' done:', index >= script.length)
  return {atomIndex: index, done: index >= script.length}

window.script = {
  parse: parseFountain
  getAtom,
  atoms,
  getDuration: -> duration
}
