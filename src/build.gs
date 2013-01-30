require! fs
require! path
let start-time = Date.now()
require! './gorilla'

async err, files <- fs.readdir './src'
throw? err

files := for file in files.sort()
  if (process.argv.length < 3 or file in process.argv[2 to -1]) and file.match(r"\.gs\$"i) and file != "prelude.gs"
    file

let done(err)
  if err?
    console.log "Failure building after $(((Date.now() - start-time) / 1000).to-fixed 3) seconds\n"
    throw err
  else
    console.log "Finished building after $(((Date.now() - start-time) / 1000).to-fixed 3) seconds\n"
if files.length == 0
  return done(null)

async! done, err <- gorilla.init()

let inputs = {}
asyncfor(0) err <- next, file in files
  let filename = path.join "./src", file
  async! next, code <- fs.read-file filename, "utf8"
  inputs[file] := { filename, code }
  next()
if err?
  return done(err)

let results = {}
asyncfor err <- next, file in files
  let {filename, code} = inputs[file]
  process.stdout.write "$filename: "
  let start-file-time = Date.now()
  async! next, compiled <- gorilla.compile code, filename: filename
  results[file] := compiled
  process.stdout.write "$(((Date.now() - start-file-time) / 1000).to-fixed 3) seconds\n"
  next()
if err?
  return done(err)

asyncfor(0) err <- next, file in files
  let compiled = results[file]
  let output-file = path.join "./lib", file.replace r"\.gs\$", ".js"
  async err <- fs.rename output-file, "$(output-file).bak"
  if err? and err.code != \ENOENT
    return next(err)
  async! next <- fs.write-file output-file, compiled, "utf8"
  next()
done(err)
