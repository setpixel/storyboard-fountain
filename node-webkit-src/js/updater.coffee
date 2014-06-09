request = require('request')
semver = require('semver')
$ = window.$

getOS = -> {darwin: 'mac', win32: 'win', linux: 'linux'}[process.platform] ? 'unk'

isNewerVersion = (newVersion, oldVersion) ->
  return false  unless newVersion and oldVersion
  semver.gt(newVersion, oldVersion)

check = (gui) ->
  request {
    headers: {
      'Cache-Control': 'no-cache'
    }
    url: window.getSetting('update-url', 'http://storyboardfountain.com/update.json')
    json: yes
  }, (err, res, data) ->
    return  if err? or res.statusCode isnt 200
    if data.updateUrl and data.downloadUrl
      window.localStorage.setItem('update-url', data.updateUrl)
    do (updateData = data[getOS()]) ->
      if updateData? and isNewerVersion(updateData.version, gui.App.manifest.version)
        do (template = window.Handlebars.compile($('#update-app-template').html())) ->
          $('#update-app .modal-body').html(template(updateData))
          $('#update-app').modal('show')
          $('.btn.btn-primary', '#update-app').click ->
            gui.Shell.openExternal(data.downloadUrl)

module.exports = {
  check
}
