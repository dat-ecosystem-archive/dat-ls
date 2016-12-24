#!/usr/bin/env node

var hypercore = require('hypercore')
var swarm = require('hyperdiscovery')
var encoding = require('hyperdrive-encoding')
var prettyBytes = require('pretty-bytes')
var memdb = require('memdb')
var progress = require('progress-string')
var ansi = require('ansi-diff-stream')

var key = process.argv[2]
var summary = process.argv.indexOf('--summary') > -1 || process.argv.indexOf('-s') > -1
var live = !summary && process.argv.indexOf('--live') > -1 || process.argv.indexOf('-l') > -1

if (!key) {
  console.error('Usage: dat-ls [key]')
  process.exit(1)
}

var changes = hypercore(memdb())
var size = 0

var feed = changes.createFeed(key)

swarm(feed)

var stream = ansi()
var bar = null
var cnt = 0
var pad = ''
var zeros = '000000000000'

var rs = feed.createReadStream({
  live: live
})

var seq = 0

rs.once('data', function () {
  console.log('Dat contains %d changes\n', feed.blocks)
  if (!live) {
    var digits = Math.log(feed.blocks) / Math.log(10)
    if (digits !== Math.ceil(digits)) digits = Math.ceil(digits)
    else digits++
    zeros = zeros.slice(0, digits)
  }

  if (summary) {
    bar = progress({width: 60, total: feed.blocks, style: function (a, b) { return a + '>' + b }})
    stream.pipe(process.stdout)
    update()
  }
})

function update () {
  var first = 'Total content size: ' + prettyBytes(size)
  if (first.length > pad.length) pad = Array(first.length + 1).join(' ')
  first += pad.slice(first.length)

  stream.write(
    '[' + bar(cnt++) + ']\n\n' +
    first + ' (' + prettyBytes(feed.bytes) + ' metadata)'
  )
}

rs.on('data', function (data) {
  var s = (seq++).toString()
  data = encoding.decode(data)

  s = zeros.slice(s.length) + s

  if (data.type === 'file') {
    size += data.length
  }

  if (summary) {
    update()
    return
  }

  switch (data.type) {
    case 'index': return console.log(s + ' [index] content --> %s', data.content ? data.content.toString('hex') : '(nil)')
    case 'file': return console.log(s + ' [file]  %s (%s, %s %s)', data.name, prettyBytes(data.length), data.blocks, data.blocks === 1 ? 'block' : 'blocks')
    case 'directory': return console.log(s + ' [dir]   %s', data.name || '(empty)')
  }

  console.log(s + ' [' + data.type + ']', data)
})

rs.on('end', function () {
  if (!summary) {
    console.log()
    console.log('Total content size: %s (%s metadata)', prettyBytes(size), prettyBytes(feed.bytes))
  }
  process.exit(0)
})
