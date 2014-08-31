surely
======

Can I add runtime type checking to JavaScript?  
  
Surely you can't be serious.  
  
I am serious... and don't call me surely.


### Install
```
npm install surely
```  

----------------------------


Example
--------

```javascript
var fs = require('fs');
var Surely = require('surely');


// --- Asynchronous error generation ---
var read = Surely
            .string('filename')   // First argument must be a string
            .object('options?')   // Second argument can optionally be an object
            .callback('callback') // Second/Third argument must be a callback function
            .wrap(fs.readFile);

read(null, function(err, data) {
  console.log(err);
  // [TypeError: Expected string for "filename"]
});


// --- Synchronous error generation ---
var readSync = Surely.string('filename').object('options?').wrap(fs.readFileSync);
var data = readSync(['foo.txt', 'bar.tar.gz']);
console.log(data);
// [TypeError: Expected string for "filename"]


// --- Using defaults ---
var random = Surely.number('min', 0).number('max', 100).wrap(function(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
});

console.log(random());
// A random value between 0 and 100

console.log(random(10));
// A random value between 10 and 100

console.log(random(10, 20));
// A random value between 10 and 20
```


Types
------
Surely comes with a set of default types. You can define your own types or override the default types with your own methods.

#### Default Types
* array
* bool
* callback
* date
* func
* number
* object
* regex
* string

#### Surely.add(name, testFunction)
You can add types by using the `add` method with a `String` name and `Function` test function.
```javascript
var Surely = require('surely');

Surely.add('int', function(val) {
  return typeof val === 'number' && Math.floor(val) === val;
});

var double = Surely.int('num').wrap(function(num) {
  return num * 2;
});

console.log(double(3.1));
// [TypeError: Expected int for 'num']
```

#### Surely.add(object)
You can also add types by using the `add` method with an object that contains key names and function values. Internally, `surely` uses this method to add the **Default Types**.
```javascript
var Surely = require('surely');

var typetest = function(type) {
  return function(val) {
    return typeof val === type;
  };
};

Surely.add({
  'number': typetest('number'),
  'string': typetest('string'),
  'array': Array.isArray
});
```

Usage
-------
Surely uses a [builder pattern](http://addyosmani.com/resources/essentialjsdesignpatterns/book/#builderpatternjquery) to construct a wrapped function.

#### Type(name, [defaultValue])

Each `type` (from the list of **Default Types** above) is a method that can be called with one required `name` argument and one optional `defaultValue` argument. To make an argument optional, append a `?` to the end of the `name` argument.

```javascript
var Surely = require('surely');

Surely
  .string('message')                // 'message' string param
  .object('data?')                  // 'data' object param that is optional
  .func('logger', console.log)  // a logging function that defaults to console.log
  .wrap(
function(message, opt_data, logger) {
  if (opt_data) {
    logger(message, opt_data);
  } else {
    logger(message);
  }
});
```


The MIT License
===============

Copyright (c) 2014 Michael Maelzer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.