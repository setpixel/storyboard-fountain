require('./config')

await require('./src/db').initialize defer()
await require('./src/models').initialize defer()
await require('./src/app').initialize defer(app)

port = process.env.PORT
app.listen port, ->
  console.log "Listening on #{port}"
