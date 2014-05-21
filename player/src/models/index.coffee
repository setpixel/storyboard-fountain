module.exports = {
  initialize: (next) ->
    ###
    module.exports.mem = require('./mem')
    await module.exports.mem.initialize defer()

    module.exports.stats = require('./stats')
    await module.exports.stats.initialize defer()
    ###

    module.exports.shares = require('./shares')
    await module.exports.shares.initialize defer()

    next()
}
