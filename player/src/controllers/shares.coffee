require('string.prototype.endswith')
util = require('util')
_ = require('underscore')
#geoip = require('geoip-lite')
class NotFound extends Error

module.exports = {
  initialize: (app) ->
    models = require('../models')
    helpers = require('../req_helpers')
    fs = require('fs')

    app.get '/shares/:key.json',
      helpers.requireShare('key'),
      (req, res) ->
        {share} = req.current
        res.json share

    app.get '/shares/new', 
      (req, res) ->
        res.render 'new_share'

    app.post '/shares',
      (req, res) ->
        # create the db record
        share = new models.shares.Share()
        share.password = '' #req.body.password
        share.allowComments = yes #req.body.allow_comments is '1'
        await models.shares.save share, defer(err)
        console.log(err)
        throw new helpers.SystemError(err)  if err?

        dataPath = process.env.DATA_PATH + '/' + share.key
        imagesPath = process.env.DATA_PATH + '/' + share.key + '/images'
        dataFile = dataPath + '/data.zip'

        # create the data dir
        await fs.mkdir dataPath, defer(err)
        console.log(err)
        throw new helpers.SystemError(err)  if err?

        # if busboy doesn't detect a valid request
        unless req.busboy
          res.end(400)
          return

        req.pipe(req.busboy)

        console.log('hwm', req.busboy.highWaterMark, 'fileHwm', req.busboy.fileHwm, )

        req.busboy.on 'field', (fieldname, value) ->
          console.log('field', fieldname, value)

        req.busboy.on 'partsLimit', ->
          console.log('partsLimit')

        req.busboy.on 'filesLimit', ->
          console.log('filesLimit')

        req.busboy.on 'fieldsLimit', ->
          console.log('fieldsLimit')

        doneWithFile = no

        # store the files
        req.busboy.on 'file', (fieldname, file, filename, encoding, mimetype) ->
          console.log('file', filename, encoding, mimetype)
          file.pipe(fs.createWriteStream(dataFile))

        # TODO: busboy.on 'field', ()

        req.busboy.on 'error', (err) -> console.log(err)

        req.busboy.on 'finish', ->
          console.log('finish')
          #res.redirect('/shares/' + share.key + '.json')
          res.json {url: process.env.PUBLIC_URL + '/player/' + share.key}

          console.log('doneWithFile', doneWithFile)
          # unzip it
          exec = require('child_process').exec
          exec "cd #{dataPath} && unzip #{dataFile}", ->
}
