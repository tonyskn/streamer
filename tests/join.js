/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true newcap: true undef: true es5: true node: true devel: true
         forin: true */
/*global define: true setTimeout: true */

!(typeof define === "undefined" ? function ($) { $(require, exports, module) } : define)(function (require, exports, module, undefined) {

'use strict';

var streamer = require('../core.js'),
    join = streamer.join, list = streamer.list
var test = require('./utils.js').test

exports['test join stream of empty streams'] = function(assert, done) {
  test(assert, done, join(list(list(), list())), [])
}

exports['test join empty & non-empty'] = function(assert, done) {
  test(assert, done, join(list(list(), list(1, 2), list())), [1, 2])
}

exports['test join joined'] = function(assert, done) {
  var stream = join(list(list(1, 2), list('a', 'b')))
  stream = join(list(list('>'), stream, list()))
  test(assert, done, stream, ['>', 1, 2, 'a', 'b'])
}

exports['test join sync & async streams'] = function(assert, done) {
  function async(next, stop) {
    setTimeout(function onTimeout(x) {
      if (!x) return stop()
      if (false !== next(x)) setTimeout(onTimeout, 0, --x)
    }, 0, 3)
  }

  var stream = join(list(async, list('|'), async, list('a', 'b'), list()))
  test(assert, done, stream, [ 3, 2, 1, '|', 3, 2, 1, 'a', 'b' ])
}


exports['test join with broken stream'] = function(assert, done) {
  var buffer = []
  function async(next, stop) {
    var x = 3
    setTimeout(function onTimeout() {
      if (!x) return stop(new Error("Boom!"))
      if (false !== next(x--)) setTimeout(onTimeout, 0)
    }, 0)
  }
  
  var stream = join(list(list('>'), async, list(1, 2) ))
  stream(function next(x) { buffer.push(x) }, function stop(error) {
    assert.equal(error.message, 'Boom!', 'error propagated')
    assert.deepEqual(buffer, [ '>', 3, 2, 1 ],
                     'all values were yielded before error')
    done()
  })
}

exports['test join async stream of streams'] = function(assert, done) {
  function async(next, stop) {
    var x = 3
    setTimeout(function onTimeout() {
      if (!x) return stop()
      if (false !== next(x--)) setTimeout(onTimeout, 0)
    }, 0)
  }
  function source(next, stop) {
    var x = 3
    next(list())
    next(list('1', '2'))
    setTimeout(function onTimeout() {
      if (!x) return (next(async), stop())
      if (false !== next(list('a', x--))) setTimeout(onTimeout, 0)
    }, 0)
  }

  test(assert, done, join(source), [ '1', '2', 'a', 3, 'a', 2, 'a', 1, 3, 2, 1 ])
}

exports['test interrupt joined stream'] = function(assert) {
  var stream = join(list(list(1, 2, 3), list(), list('a', 'b'), list('!')))
  var buffer = []
  var stopped = []
  stream(function onNext(element) {
    buffer.push(element)
    if (buffer.length === 3) return false
  }, stopped.push.bind(stopped))

  assert.deepEqual(buffer, [ 1, 2, 3 ],
                   'stream yielded elements until it was interrupted')

  buffer = []
  stream(function onNext(element) {
    buffer.push(element)
    if (buffer.length === 4) return false
  }, stopped.push.bind(stopped))
  assert.deepEqual(buffer, [ 1, 2, 3, 'a' ],
                   'stream yielded elements until it was interrupted')

  buffer = []
  stream(function onNext(element) {
    buffer.push(element)
    if (buffer.length === 6) return false
  }, stopped.push.bind(stopped))
  assert.deepEqual(buffer, [ 1, 2, 3, 'a', 'b', '!' ],
                   'stream yielded elements until it was interrupted')

  assert.equal(stopped.length, 0, 'interrupted streams do not stop')
}

if (module == require.main)
  require('test').run(exports)

});
