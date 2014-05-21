util = require('util')
_ = require('underscore')
#geoip = require('geoip-lite')
class NotFound extends Error

module.exports = {
  initialize: (app) ->
    models = require('../models')
    helpers = require('../req_helpers')
    fs = require('fs')

    app.get '/player/:key',
      helpers.requireShare('key'),
      (req, res) ->
        {share} = req.current
        res.render 'player', {share, dataUrl: process.env.PUBLIC_URL + '/data/'}

    app.get '/player/:key/password',
      helpers.requireShare('key'),
      (req, res) ->
        #...

    app.post '/player/:key/password',
      helpers.requireShare('key'),
      (req, res) ->
        #...

    # files

    app.get '/data/:key/script.fountain', 
      helpers.requireShare('key'),
      (req, res) ->
        console.log('requesting script', req.params.key)
        file = process.env.DATA_PATH + '/' + req.params.key + '/script.fountain'
        await fs.stat file, defer(err, stats)
        if err
          console.log('not found')
          res.status(404).end()
        else
          res.setHeader 'Content-Type', 'text/plain'
          fs.createReadStream(file).pipe(res)

    app.get '/data/:key/images/:filename.jpeg',
      helpers.requireShare('key'),
      (req, res) ->
        console.log('requesting image', req.params.key, req.params.filename)
        file = process.env.DATA_PATH + '/' + req.params.key + '/images/' + req.params.filename + '.jpeg'
        await fs.stat file, defer(err, stats)
        if err
          console.log('not found')
          res.status(404).end()
        else
          res.setHeader 'Content-Type', 'image/jpeg'
          fs.createReadStream(file).pipe(res)
}
