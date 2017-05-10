#!/usr/bin/env node

var swarm = require('hyperdiscovery')
var hyperdrive = require('hyperdrive')
var prettyBytes = require('pretty-bytes')
var ram = require('random-access-memory')

var key = process.argv[2]
var live = process.argv.indexOf('--live') > -1 || process.argv.indexOf('-l') > -1

if (!key) {
  console.error('Usage: dat-ls [key]')
  process.exit(1)
}

var archive = hyperdrive(ram, key, {sparse: true})
var size = 0

archive.ready(function () {
  swarm(archive)
  archive.metadata.update(run)
})

function run () {
  var zeros = '000000000000'
  var files = {}

  var rs = archive.history({
    live: live
  })

  var seq = 0

  console.log('Dat contains %d changes\n', archive.metadata.length)
  if (!live) {
    var digits = Math.log(archive.metadata.length) / Math.log(10)
    if (digits !== Math.ceil(digits)) digits = Math.ceil(digits)
    else digits++
    zeros = zeros.slice(0, digits)
  }

  rs.on('data', function (data) {
    var s = (seq++).toString()
    s = zeros.slice(s.length) + s

    if (data.type === 'put') {
      // TODO: delete size for later deletes
      if (files[data.name]) size -= files[data.name].value.size

      size += data.value.size
      files[data.name] = data
    }
    if (data.type === 'del') {
      size -= files[data.name].value.size
      delete files[data.name]
    }

    switch (data.type) {
      case 'put': return console.log(s + ' [put]  %s (%s, %s %s)', data.name, prettyBytes(data.value.size), data.value.blocks, data.value.blocks === 1 ? 'block' : 'blocks')
      case 'del': return console.log(s + ' [del]  %s', data.name || '(empty)')
    }

    console.log(s + ' [' + data.type + ']', data.name)
  })

  rs.on('end', function () {
    console.log()
    console.log('Total content size: %s (%s metadata)', prettyBytes(size), prettyBytes(archive.metadata.byteLength))
    process.exit(0)
  })
}
