_ = require('underscore')

module.exports = {
  initialize: (app) ->
    models = require('../models')
    helpers = require('../req_helpers')

    app.get '/status.json',
      (req, res) ->
        unless req.query.admin is process.env.ADMIN_KEY
          res.json {err: 'invalid admin key'}
        await models.shares.list defer(err, shares)
        res.json {shares}
}
