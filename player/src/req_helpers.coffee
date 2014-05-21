url = require('url')
models = require('./models')

class SystemError extends Error then constructor: (message) -> super(message)

module.exports = {
  SystemError,

  requireShare: (param) ->
    (req, res, next) ->
      await models.shares.lookupByKey req.params[param], defer(err, share)
      throw new SystemError(err)  if err?
      req.current.share = share
      next()
}
