_ = require('underscore')
util = require('util')
moment = require('moment')
pg = require('../db/pg')
shortId = require('shortid')

class Share
  @id: null
  constructor: (data) ->
    {@key, @password, @allowComments} = data  if data?
    @key = shortId.generate()  unless @key?

module.exports = {
  initialize: (next) -> 
    next()

  Share,

  save: (share, next) ->
    createdAt = new Date()

    sql = """
    INSERT INTO shares(key, password, allow_comments, created_at)
    VALUES ($1, $2, $3, $4) 
    RETURNING id
    """
    fields = [
      share.key
      share.password
      share.allowComments
      createdAt
    ]
    await pg.query sql, fields, defer(err, result)
    return next(err)  if err?
    id = result?.rows?[0].id
    return next('invalid id')  unless id?

    share.id = id
    share.createdAt = createdAt
    next()

  lookupByKey: (key, next) ->
    sql = """
    SELECT *
    FROM shares
    WHERE key = $1
    """
    fields = [key]
    await pg.query sql, fields, defer(err, result)
    return next(err)  if err?
    row = result?.rows?[0]
    # not found
    return next(null)  unless row?

    data = {
      id: row.id
      key: row.key
      password: row.password
      allowComments: row.allowComments
      createdAt: Date.parse(row.created_at)
    }
    next(null, new Share(data))
}
