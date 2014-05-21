_ = require('underscore')

module.exports = {
  initialize: (app) ->
    models = require('../models')
    helpers = require('../req_helpers')

    app.get '/status',
      (req, res) ->
        res.end()
}
