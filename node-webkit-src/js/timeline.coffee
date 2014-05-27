clone = require('clone')
_ = require('underscore')

updates = []
atomToUpdate = {}
scriptDuration = 0

buildUpdates = ->
  atomDuration = (atom) ->
    atom.duration or 1000

  updates = []
  scriptDuration = 0

  do (buildingImages = no, duration = 0, time = 0, text = {}, images = []) ->
    # set the current state for the text and images
    window.fountainManager.atoms 0, (atom, index) ->
      id = atom.id
      duration = atomDuration(atom)
      console.log('atom duration:', duration, ' type:', atom.type)

      addUpdates = ->
        if buildingImages
          for image in images
            do (duration = image.duration) ->
              updates.push {
                index: updates.length,
                atomId: image.id,
                time, 
                duration, 
                state: {text: clone(text), image}
              }
              atomToUpdate[image.id] = _.last(updates)
              time += duration
        else
          do (duration = text.duration) ->
            updates.push {
              index: updates.length,
              atomId: text.id,
              time, 
              duration, 
              state: {text: clone(text), image: images[0]}
            }
            atomToUpdate[text.id] = _.last(updates)
            time += duration

      switch atom.type

        when 'title'
          text = {type: 'title', text: atom.text, duration, id}
          addUpdates()
          buildingImages = no

        when 'transition'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'transition', text: atom.text, duration, id}
          addUpdates()
          buildingImages = no

        when 'action'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'action', text: atom.text, duration, id}
          addUpdates()
          buildingImages = no

        when 'dialogue'
          text = {type: 'dialogue', texts: [], duration: 0}  unless text.type is 'dialogue' and atom.dual
          text.id = id
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          else
            text.duration += duration
          text.texts.push {character: atom.character, text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'parenthetical'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'parenthetical', text: atom.text, duration, id}
          addUpdates()
          buildingImages = no

        when 'image'
          images = []  unless buildingImages
          buildingImages = yes
          images.push {file: atom.file, duration, id}
          text = {}

        when 'scene_heading'
          text = {}
          images = []
          buildingImages = no
          duration = 0

        else
          duration = 0

      return yes
  scriptDuration = updates[updates.length - 1].time + updates[updates.length - 1].duration

getUpdateForAtom = (atom) -> atomToUpdate[atom.id]

module.exports = {
  buildUpdates,
  updates: -> updates,
  scriptDuration: -> scriptDuration,
  getUpdateForAtom
}
