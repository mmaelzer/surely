var _ = require('lodash');

/**
 *  @param {String=} opt_argName
 *  @param {String=} opt_type
 *  @constructor
 */
function Surely(opt_argName, opt_type, opt_default) {
  this.args = opt_argName && opt_type ? [this._buildArg(opt_argName, opt_type, opt_default)] : [];
}

/**
 *  Provides a mechnism for 'types' to be added to the global Surely object
 *  @param {String|Object}
 *  @param {Function=} testFunction
 *  @public
 */
Surely.add = function(type, testFunction) {
  var obj = type;
  if (_.isString(type)) {
    obj = {};
    obj[type] = testFunction;
  }

  // Build up the Surely object with methods for types
  Object.keys(obj).forEach(function(type) {
    var factory = builderFactory(type);
    Surely[type] = factory;
    Surely.prototype[type] = factory;
    Surely.types[type] = obj[type];
  });

  return this;
};

/**
 *  An enum of type checking methods to call on a list of arguments.
 *  @enum {Function}
 */
Surely.types = {};

// Default type list
Surely.add({
  'array': Array.isArray,
  'bool': _.isBoolean,
  'callback': _.isFunction,
  'date': _.isDate,
  'func': _.isFunction,
  'number': _.isNumber,
  'object': _.isObject,
  'regex': _.isRegExp,
  'string': _.isString
});

/**
 *  @param {String} name
 *  @param {String} type
 *  @param {*=} opt_default
 *  @return {Object}
 *  @private
 */
Surely.prototype._buildArg = function(name, type, opt_default) {
  return {
    type: type,
    name: name.replace(/\?/g, ''),
    optional: /\?$/.test(name) || !_.isUndefined(opt_default),
    default: opt_default
  };
};

/**
 *  @param {Function} fn
 *  @return {Function}
 *  @public
 */
Surely.prototype.wrap = function(fn) {
  var self = this;
  var boundFunction = function surelyWrap() {
    // optimization to avoid passing arguments around since it causes a performance hit
    // to V8 per https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    var parsedArgs = self.parse(args);
    if (parsedArgs instanceof Error) {
      return self._handleError(parsedArgs, args);
    } else {
      return fn.apply(this, parsedArgs);
    }
  };
  boundFunction.expects = this.args;
  return boundFunction;
};

/**
 *  @param {Error} err
 *  @param {Arguments} args
 *  @return {Error=}
 */
Surely.prototype._handleError = function(err, args) {
  var callback = this._getCallbackFromArguments(args);
  if (callback) {
    callback(err);
  } else {
    return err;
  }
};

/** @return {Boolean} **/
Surely.prototype._hasCallback = function() {
  return _.chain(this.args).pluck('type').contains('callback').value();
};

/**
 *  @param {Array.<Object>} args
 *  @return {Function}
 */
Surely.prototype._getCallbackFromArguments = function(args) {
  var indexOfCallback = _.chain(this.args)
                          .pluck('type')
                          .indexOf('callback')
                          .value();
  var callback = args[indexOfCallback];
  return _.isFunction(callback) ? callback : null;
};

/**
 *  Parse arguments or an object and return an arguments array that can be then
 *  used on a function via func.apply(context, arg). Return an Error
 *  if arguments do not meet the validation rules in this.args
 *  @param {Object} options
 *  @return {Array.<*>|Error}
 *  @public
 */
Surely.prototype.parse = function(args) {
  if ((_.isObject(args) && !_.isArray(args)) || this._firstArgIsObjectWithParams(args)) {
    return this._parseObject(_.isObject(args) && args.length ? args[0] : args);
  } else {
    return this._parseArguments(args);
  }
};


/**
 *  @param {Array.<*>} args
 *  @return {Boolean}
 */
Surely.prototype._firstArgIsObjectWithParams = function(args) {
  return args.length === 1 &&
         _.isObject(args[0]) &&
         this.args[0].type !== 'object';
};

/** @return {Number} **/
Surely.prototype._getRequiredArgsLength = function() {
  return _.reject(this.args, function(arg) {
    return arg.optional;
  }).length;
};

/**
 *  @param {*} val
 *  @return {Boolean}
 */
Surely.prototype._notValue = function(val) {
  return _.isUndefined(val) || _.isNull(val);
};

/**
 *  @param {Object} argsToParse
 *  @return {Array.<*>|Error}
 *  @private
 */
Surely.prototype._parseArguments = function(argsToParse) {
  // If the arguments and our list of args to check are different
  // in length, the test has already failed
  var required = this._getRequiredArgsLength();
  if (required > argsToParse.length) {
    return new Error('Incorrect number of parameters. Expected ' +
                     required + ' found ' + argsToParse.length + '.');
  }
  var parsedArgs = [];
  for (var i = 0; i < this.args.length; i++) {
    var arg = this.args[i];
    var val = argsToParse[i];

    if (this._testValueWithType(val, arg.type)) {
      parsedArgs.push(val);
    } else if (arg.optional && this._notValue(val)) {
      parsedArgs.push(arg.default);
    } else {
      return new TypeError('Expected ' + arg.type + ' for "' + arg.name + '"');
    }
  }
  return parsedArgs;
};

/**
 *  @param {Object} options
 *  @return {Array.<*>|Error}
 *  @private
 */
Surely.prototype._parseObject = function(options) {
  // If the number of keys in the options object is less than
  // the number of args to check, the test has already failed
  var keys = _.isObject(options) ? Object.keys(options) : [];
  var required = this._getRequiredArgsLength();
  if (keys.length < required) {
    return new Error('Incorrect number of parameters. Expected ' +
                     required + ' found ' + keys.length + '.');
  }

  var parsedArgs = [];
  for (var i = 0; i < this.args.length; i++) {
    var arg = this.args[i];
    if (arg.name in options) {
      var val = options[arg.name];
      if (this._testValueWithType(val, arg.type)) {
        parsedArgs.push(val);
      } else {
        return new TypeError('Parameter "' + arg.name +
          '" is not the correct type. Expected type "' + arg.type + '"');
      }
    } else if (arg.optional) {
      parsedArgs.push(arg.default);
    } else {
      return new Error('Missing parameter: ' + arg.name);
    }
  }
  return parsedArgs;
};

/**
 *  @param {*} value
 *  @param {String} type
 *  @return {Boolean}
 *  @private
 */
Surely.prototype._testValueWithType = function(value, type) {
  return Surely.types[type](value);
};

/**
 *  @param {String} type
 *  @return {Function(String, Boolean=)}
 */
function builderFactory(type) {
  return function(name, opt_default) {
    if (this instanceof Surely) {
      this.args.push(this._buildArg(name, type, opt_default));
      return this;
    } else {
      return new Surely(name, type, opt_default);
    }
  };
}

module.exports = Surely;