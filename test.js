var test = require('node:test');
var assert = require('node:assert');

var Surely = require('./surely');

test('numbers', function() {
  Surely.add('int', function(val) {
    return typeof val === 'number' && Math.floor(val) === val;
  });

  Surely.add({
    'even': function(val) {
      return val % 2 === 0;
    }
  });

  assert.ok('int' in Surely.types, 'Surely.add(string, fn) adds a type');
  assert.ok('even' in Surely.types, 'Surely.add(object) adds a type');

  var double = Surely.int('val').wrap(function(val) {
    return 2*val;
  });

  assert.ok(double(1.2) instanceof Error, 'Type added with Surely.add(string, fn) returns an Error on invalid type');
  assert.strictEqual(double(2), 4, 'Type added with Surely.add(string, fn) calls the underlying function properly');

  var half = Surely.even('val').wrap(function(val) {
    return val / 2;
  });

  assert.ok(half(3) instanceof Error, 'Type added with Surely.add(object) returns an Error on invalid type');
  assert.strictEqual(half(4), 2, 'Type added with Surely.add(object) calls the underlying function properly');

});

test('async', function() {
  var asyncFn = Surely.array('arr').callback('callback').wrap(function(arr, callback) {
    callback(null, arr.slice());
  });

  asyncFn('array', function(err, array) {
    assert.ok(err instanceof Error, 'Surely with callback param passes an Error to the given callback');
  });

  asyncFn([1,2,3], function(err, array) {
    assert.deepStrictEqual(array, [1,2,3], 'Surely with callback param passes values to the given callback');
  });

});

test('objects', function() {
  var fnWithObject = Surely.number('num').string('str').regex('reg?').wrap(function(num, str, reg) {
    return {
      num: num,
      str: str,
      reg: reg
    };
  });

  var testObject = {
    num: 123,
    str: 'foo',
    reg: /^this\smy\sregex$/
  };

  assert.deepStrictEqual(fnWithObject(testObject), testObject, 'Surely called with an object that matches params is valid');
  assert.ok(fnWithObject({num: 213}) instanceof Error, 'Surely called with an object that does not match params is not valid');
});

test('optional', function() {
  var optional = Surely.date('time?').wrap(function(time) {
    return time ? +time : 0;
  });

  assert.strictEqual(optional(), 0, 'Surely with an optional param is valid when that param is not provided');

  var now = new Date();
  assert.strictEqual(optional(now), +now, 'Surely with an optional param is valid when that param is provied');

});

test('default params', function() {
  var sqr = Surely.number('sumNumber', 7).wrap(function(sumNumber) {
    return sumNumber * sumNumber;
  });

  assert.strictEqual(sqr(9), 81, 'Surely with a default param is valid when that param is provied');

  assert.strictEqual(sqr(), 49, 'Surely with a default param is valid when that param is not provieded');

});

test('errors', function() {
  var concat = Surely
                .string('prefix')
                .string('word')
                .string('suffix', '')
                .wrap(function(prefix, name, suffix) {
                  return prefix + name + suffix;
                });

  var str1 = concat('pre');
  assert.ok(str1 instanceof Error, 'Surely returns an error if the number of expected args is not equal to the number of args passed');

  var str2 = concat({
    prefix: 123,
    word: ' are numbers'
  });
  assert.ok(str2 instanceof Error, 'Surely returns an error if any of the arguments do not meet the expected type');

  var str3 = concat({
    prefix: 'pre',
    word: 'fix'
  });
  assert.strictEqual(str3, 'prefix');

  var str4 = concat({
    prefix: 'pre',
    foo: 'bar'
  });
  assert.ok(str4 instanceof Error, 'Surely returns an error if a required parameter is missing in an arguments object but the argument object has the correct number of keys');

});

/**
 * Surely.types is public API, and these predicates used to be lodash's. The
 * semantics worth pinning are the surprising ones: `object` is true for any
 * non-primitive, and the tag checks accept boxed primitives. Callers inside
 * surely.js rely on both.
 */
test('type predicates match the lodash semantics they replaced', function() {
  var t = Surely.types;

  assert.ok(t.object({}), 'object: plain object');
  assert.ok(t.object([]), 'object: arrays are non-primitives');
  assert.ok(t.object(function() {}), 'object: functions are non-primitives');
  assert.ok(t.object(new Date()), 'object: dates are non-primitives');
  assert.ok(!t.object(null), 'object: null is not');
  assert.ok(!t.object('x'), 'object: strings are not');
  assert.ok(!t.object(0), 'object: numbers are not');

  assert.ok(t.string('x') && t.string(new String('x')), 'string: primitive and boxed');
  assert.ok(!t.string(1), 'string: rejects numbers');

  assert.ok(t.number(1) && t.number(NaN) && t.number(new Number(1)), 'number: incl. NaN and boxed');
  assert.ok(!t.number('1'), 'number: rejects numeric strings');

  assert.ok(t.bool(true) && t.bool(false) && t.bool(new Boolean(true)), 'bool: primitive and boxed');
  assert.ok(!t.bool(0) && !t.bool(''), 'bool: rejects falsy non-booleans');

  assert.ok(t.date(new Date()), 'date: accepts Date');
  assert.ok(!t.date('2020-01-01') && !t.date(Date.now()), 'date: rejects strings and timestamps');

  assert.ok(t.regex(/x/) && t.regex(new RegExp('x')), 'regex: literal and constructed');
  assert.ok(!t.regex('/x/'), 'regex: rejects strings');

  assert.ok(t.func(function() {}) && t.func(function*() {}), 'func: incl. generators');
  assert.ok(!t.func({}), 'func: rejects objects');

  assert.ok(t.array([]) && !t.array({length: 0}), 'array: rejects array-likes');
});
