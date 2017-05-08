#!/usr/bin/env node

var hypercore = require('hypercore')
var swarm = require('hyperdiscovery')
var messages = require('hyperdrive/lib/messages')
var prettyBytes = require('pretty-bytes')
var ram = require('random-access-memory')
var progress = require('progress-string')
var ansi = require('ansi-diff-stream')
var tree = require('append-tree')

var key = process.argv[2]
var summary = process.argv.indexOf('--summary') > -1 || process.argv.indexOf('-s') > -1
var live = !summary && process.argv.indexOf('--live') > -1 || process.argv.indexOf('-l') > -1

if (!key) {
  console.error('Usage: dat-ls [key]')
  process.exit(1)
}

var feed = hypercore(ram, key, {sparse: true})
var tr = tree(feed, {offset: 1, valueEncoding: messages.Stat})
var size = 0

feed.ready(function () {
  swarm(feed)
  feed.update(run)
})

function run () {
  var stream = ansi()
  var bar = null
  var cnt = 0
  var pad = ''
  var zeros = '000000000000'

  var rs = tr.history({
    live: live
  })

  var seq = 0

  console.log('Dat contains %d changes\n', feed.length)
  if (!live) {
    var digits = Math.log(feed.length) / Math.log(10)
    if (digits !== Math.ceil(digits)) digits = Math.ceil(digits)
    else digits++
    zeros = zeros.slice(0, digits)
  }

  if (summary) {
    bar = progress({width: 60, total: feed.length, style: function (a, b) { return a + '>' + b }})
    stream.pipe(process.stdout)
    update()
  }

  function update () {
    var first = 'Total content size: ' + prettyBytes(size)
    if (first.length > pad.length) pad = Array(first.length + 1).join(' ')
    first += pad.slice(first.length)

    stream.write(
      '[' + bar(cnt++) + ']\n\n' +
      first + ' (' + prettyBytes(feed.byteLength) + ' metadata)'
    )
  }

  rs.on('data', function (data) {
    var s = (seq++).toString()
    s = zeros.slice(s.length) + s

    if (data.type === 'put') {
      // TODO: delete size for later deletes
      size += data.value.size
    }

    if (summary) {
      update()
      return
    }

    switch (data.type) {
      case 'put': return console.log(s + ' [put]  %s (%s, %s %s)', data.name, prettyBytes(data.value.size), data.value.blocks, data.value.blocks === 1 ? 'block' : 'blocks')
      case 'del': return console.log(s + ' [del]   %s', data.name || '(empty)')
    }

    console.log(s + ' [' + data.type + ']', data.name)
  })

  rs.on('end', function () {
    if (!summary) {
      console.log()
      console.log('Total content size: %s (%s metadata)', prettyBytes(size), prettyBytes(feed.byteLength))
    }
    process.exit(0)
  })
}
