util = require('util')
pg = require("pg")
# TODO?: client.end()

module.exports = {
  initialize: (next) ->
    # confirm we can connect to the db
    url = process.env.POSTGRES_URL
    await pg.connect url, defer(err, client, done)
    if err?
      console.error('pg connection error', util.inspect(err))
    done()
    next()

  query: (sql, fields, next) ->
    # allow (sql, next) to be passed if there are no fields to fill
    if arguments.length is 2
      next = fields
      fields = []

    url = process.env.POSTGRES_URL
    await pg.connect url, defer(err, client, done)
    await client.query sql, fields, defer(err, result)
    done()
    if err? and err.code isnt '23505'
      next(err)
    else
      next(null, result)
}
