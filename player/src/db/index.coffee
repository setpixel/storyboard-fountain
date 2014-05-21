module.exports = {
  initialize: (next) ->
    await require('./pg').initialize defer()
    next()
}
