util = require('util')

module.exports = {
  app: null
  initialize: (next) ->
    express = require('express')
    logfmt = require('logfmt')
    flash = require('connect-flash')
    app = express()
    busboy = require('connect-busboy')

    session = require('express-session')
    RedisStore = require('connect-redis')(session)

    helpers = require('./req_helpers')

    #app.use(helpers.startTimer)
    app.use(logfmt.requestLogger())
    app.use(require('cookie-parser')())
    app.use(session({
      store: new RedisStore({
        host: process.env.REDIS_HOST
        port: process.env.REDIS_PORT
        pass: process.env.REDIS_PASSWORD
        db: process.env.REDIS_DBID
        ttl: 30 * 24 * 60 * 60  # 30 days
      })
      secret: process.env.SESSION_SECRET
    }))
    app.use(flash())
    app.use (req, res, next) ->
      req.current ?= {}
      req.current.url = req.url
      res.locals.current = req.current
      next()

    app.set('views', "#{__dirname}/../views")
    app.set('view engine', 'jade')
    app.use(express.static("#{__dirname}/../public"))

    app.use(busboy())

    app.get '/', (req, res) ->
      res.send 'storyboard-fountain player'

    require('./controllers').initialize(app)

    module.exports.app = app
    next(app)
}
