/*
 * index.js: Island utils.
 *
 */

// Module Dependencies
var crypto = require('crypto');
var util = require('util');
var _ = require('underscore');
_.mixin(require('underscore.string'));

/*
 * Prepare obj for client.
 * - replace ObjectsIDs with strings.
 */
exports.client = function (obj) {
  obj = _.clone(obj);
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  _.each(obj, function (att, n) {
    if (_.isObject(att) && att._id) {
      att.id = att._id.toString();
      delete att._id;
      exports.client(att);
    } else if (_.isObject(att) || _.isArray(att)) {
      exports.client(att);
    }
  });
  return obj;
};

/*
 * Creates a string identifier.
 * @length Number
 */
exports.key = function (length) {
  length = length || 8;
  var key = '';
  var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; ++i) {
    key += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return key;
};

/*
 * Returns true if valid date
 * http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
exports.isValidDate = function(d) {
  if (Object.prototype.toString.call(d) === "[object Date]") {
    if (!(isNaN(d.getTime()))) {
      return true;
    }
  }
  return false;
}

/*
 * Returns the first property of object that does not match given type.
 */
exports.validateObjectTypes = function (types, props) {
  var list = _.map(types, function (v, k) {
    return {k: k, t: v};
  });
  var invalid = _.find(list, function (p) {
    return typeof props[p.k] !== p.t;
  });
  if (invalid) {
    invalid.msg = invalid.k + ' must be a ' + invalid.t;
  }
  return invalid;
}

/*
 * Make salt for a password.
 */
exports.salt = function () {
  return Math.round((new Date().valueOf() * Math.random())) + '';
};

/*
 * Encrypt string.
 */
exports.encrypt = function (str, salt) {
  return crypto.createHmac('sha1', salt).update(str).digest('hex');
};

/*
 * Hash string.
 */
exports.hash = function (str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

/*
 * Create a 32-bit identifier.
 */
exports.createId_32 = function () {
  return parseInt(Math.random() * 0x7fffffff);
};

/*
 * Remove ''s from an object.
 */
exports.removeEmptyStrings = function (obj) {
  _.each(obj, function (v, k) {
    if (_.isString(v) && v.trim() === '') {
      delete obj[k];
    }
  });
};

/*
 * Convert tag string to array.
 */
exports.tagify = function (str, delim) {
  var splitter = delim ? '[' + delim + ']': '[\\W,_]';
  return !str ? []: _.chain(str.split(new RegExp(splitter)))
    .reject(function (t) { return t === ''; })
    .map(function (t) { return t.trim(); }).uniq().value();
};
