#!/usr/bin/env node

var hypercore = require('hypercore')
var swarm = require('hyperdrive-archive-swarm')
var encoding = require('hyperdrive-encoding')
var prettyBytes = require('pretty-bytes')
var memdb = require('memdb')

var key = process.argv[2]
var live = process.argv.indexOf('--live') > -1 || process.argv.index('-l') > -1

if (!key) {
  console.error('Usage: dat-ls [key]')
  process.exit(1)
}

var changes = hypercore(memdb())
var size = 0

var feed = changes.createFeed(key)

swarm(feed)

var rs = feed.createReadStream({
  live: live
})

rs.once('data', function () {
  console.log('Dat contains %d changes\n', feed.blocks)
})

rs.on('data', function (data) {
  data = encoding.decode(data)

  if (data.type === 'file') {
    size += data.length
  }

  switch (data.type) {
    case 'index': return console.log('[index] content --> %s', data.content ? data.content.toString('hex') : '(nil)')
    case 'file': return console.log('[file]  %s (%s, %s blocks)', data.name, prettyBytes(data.length), data.blocks)
    case 'directory': return console.log('[dir]   %s', data.name || '(empty)')
  }

  console.log('[' + data.type + ']', data)
})

rs.on('end', function () {
  console.log()
  console.log('Total content size: %s', prettyBytes(size))
  process.exit(0)
})
