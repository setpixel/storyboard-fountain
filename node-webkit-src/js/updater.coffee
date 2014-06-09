gui = window.nwDispatcher.requireNwGui();
request = require('request')
semver = require('semver')

getOS = -> {darwin: 'mac', win32: 'win', linux: 'linux'}[process.platform] ? 'unk'

isNewerVersion = (newVersion, oldVersion) ->
  return false  unless newVersion and oldVersion
  semver.gt(newVersion, oldVersion)

check = (next) ->
  request {
    url: window.getSetting('update-url', 'http://storyboardfountain.com/update.json')
    json: yes
  }, (err, res, data) ->
    return next()  if err? or res.statusCode isnt 200
    if data.updateUrl and data.downloadUrl
      window.localStorage.setItem('update-url', data.updateUrl)
    do (updateData = data[getOS()]) ->
      if updateData? and isNewerVersion(updateData.version, gui.App.manifest.version)
        do (msg = 'A new version of Storyboard Fountain is available (' + updateData.version + ').\n\n' + 
                  'Press OK to go to the website where you can download the latest version.\n\n' +
                  'What\'s New:\n' + updateData.description) ->
          if window.confirm(msg)
            gui.Shell.openExternal(data.downloadUrl)  
          next()

module.exports = {
  check
}
