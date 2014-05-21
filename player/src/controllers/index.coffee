module.exports = {
  initialize: (app) ->
    #require('./auth').initialize(app)
    #require('./users').initialize(app)
    require('./status').initialize(app)
    require('./shares').initialize(app)
    require('./player').initialize(app)
}
