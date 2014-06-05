updates = []
scriptDuration = 0

buildUpdates = ->
  atomDuration = (atom) ->
    atom.duration or 1000

  do (buildingImages = no, duration = 0, time = 0, text = {}, images = []) ->
    # set the current state for the text and images
    script.atoms 0, (atom, index) ->
      duration = atomDuration(atom)
      console.log('atom duration:', duration, ' type:', atom.type)

      addUpdates = ->
        if buildingImages
          for image in images
            do (duration = image.duration) ->
              updates.push {
                time, 
                duration, 
                state: {text, image}
              }
              time += duration
        else
          do (duration = text.duration) ->
            updates.push {
              time, 
              duration, 
              state: {text, image: images[0]}
            }
            time += duration

      switch atom.type

        when 'title'
          text = {type: 'title', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'transition'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'transition', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'action'
          if buildingImages  # if we were just adding images, ignore this duration
            duration = 0
          text = {type: 'action', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'dialogue'
          text = {type: 'dialogue', texts: [], duration: 0}  unless text.type is 'dialogue' and atom.dual
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
          text = {type: 'parenthetical', text: atom.text, duration}
          addUpdates()
          buildingImages = no

        when 'image'
          images = []  unless buildingImages
          buildingImages = yes
          images.push {file: atom.file, duration}
          console.log('images.length:', images.length)
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

window.updates = {
  buildUpdates,
  getUpdates: -> updates,
  getScriptDuration: -> scriptDuration
}
