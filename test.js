var test = require('tape');
var Surely = require('./surely');

test('surely', function(t) {
  t.plan(14);

  Surely.add('int', function(val) {
    return typeof val === 'number' && Math.floor(val) === val;
  });

  Surely.add({
    'even': function(val) {
      return val % 2 === 0;
    }
  });

  t.ok('int' in Surely.types, 'Surely.add(string, fn) adds a type');
  t.ok('even' in Surely.types, 'Surely.add(object) adds a type');

  var double = Surely.int('val').wrap(function(val) {
    return 2*val;
  });

  t.ok(double(1.2) instanceof Error, 'Type added with Surely.add(string, fn) returns an Error on invalid type');
  t.equal(double(2), 4, 'Type added with Surely.add(string, fn) calls the underlying function properly');

  var half = Surely.even('val').wrap(function(val) {
    return val / 2;
  });

  t.ok(half(3) instanceof Error, 'Type added with Surely.add(object) returns an Error on invalid type');
  t.equal(half(4), 2, 'Type added with Surely.add(object) calls the underlying function properly');

  var asyncFn = Surely.array('arr').callback('callback').wrap(function(arr, callback) {
    callback(null, arr.slice());
  });

  asyncFn('array', function(err, array) {
    t.ok(err instanceof Error, 'Surely with callback param passes an Error to the given callback');
  });

  asyncFn([1,2,3], function(err, array) {
    t.deepEqual(array, [1,2,3], 'Surely with callback param passes values to the given callback');
  });

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
  }

  t.deepEqual(fnWithObject(testObject), testObject, 'Surely called with an object that matches params is valid');
  t.ok(fnWithObject({num: 213}) instanceof Error, 'Surely called with an object that does not match params is not valid');

  var optional = Surely.date('time?').wrap(function(time) {
    return time ? +time : 0;
  });

  t.equal(optional(), 0, 'Surely with an optional param is valid when that param is not provided');

  var now = new Date();
  t.equal(optional(now), +now, 'Surely with an optinal param is valid when that param is provied');

  var sqr = Surely.number('sumNumber', 7).wrap(function(sumNumber) {
    return sumNumber * sumNumber;
  });

  t.equal(sqr(9), 81, 'Surely with a default param is valid when that param is provied');

  t.equal(sqr(), 49, 'Surely with a default param is valid when that param is not provieded');

});