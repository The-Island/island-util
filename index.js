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
 * Returns true if valid date
 * http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
exports.isValidDate = function(d) {
  if (Object.prototype.toString.call(d) === '[object Date]') {
    if (!(isNaN(d.getTime()))) {
      return true;
    }
  }
  return false;
};

/*
 * Returns a format function for Date objects
 */
exports.dateFormat = function () {
  var  token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
    timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
    timezoneClip = /[^-+\dA-Z]/g,
    pad = function (val, len) {
      val = String(val);
      len = len || 2;
      while (val.length < len) val = "0" + val;
      return val;
    };

  // Regexes and supporting functions are cached through closure
  return function (date, mask, utc) {
    var dF = exports.dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date): new Date();
    if (isNaN(date)) {
      throw SyntaxError("invalid date");
    }

    mask = String(dF.masks[mask] || mask || dF.masks["default"]);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) == "UTC:") {
      mask = mask.slice(4);
    }

    var  _ = utc ? "getUTC" : "get",
      d = date[_ + "Date"](),
      D = date[_ + "Day"](),
      m = date[_ + "Month"](),
      y = date[_ + "FullYear"](),
      H = date[_ + "Hours"](),
      M = date[_ + "Minutes"](),
      s = date[_ + "Seconds"](),
      L = date[_ + "Milliseconds"](),
      o = utc ? 0 : date.getTimezoneOffset(),
      flags = {
        d:    d,
        dd:   pad(d),
        ddd:  dF.i18n.dayNames[D],
        dddd: dF.i18n.dayNames[D + 7],
        m:    m + 1,
        mm:   pad(m + 1),
        mmm:  dF.i18n.monthNames[m],
        mmmm: dF.i18n.monthNames[m + 12],
        yy:   String(y).slice(2),
        yyyy: y,
        h:    H % 12 || 12,
        hh:   pad(H % 12 || 12),
        H:    H,
        HH:   pad(H),
        M:    M,
        MM:   pad(M),
        s:    s,
        ss:   pad(s),
        l:    pad(L, 3),
        L:    pad(L > 99 ? Math.round(L / 10) : L),
        t:    H < 12 ? "a"  : "p",
        tt:   H < 12 ? "am" : "pm",
        T:    H < 12 ? "A"  : "P",
        TT:   H < 12 ? "AM" : "PM",
        Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
        o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
        S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
      };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  };
}();

// Some common format strings
exports.dateFormat.masks = {
  "default":      "ddd mmm dd yyyy HH:MM:ss",
  shortDate:      "m/d/yy",
  mediumDate:     "mmm d, yyyy",
  longDate:       "mmmm d, yyyy",
  fullDate:       "dddd, mmmm d, yyyy",
  shortTime:      "h:MM TT",
  mediumTime:     "h:MM:ss TT",
  longTime:       "h:MM:ss TT Z",
  isoDate:        "yyyy-mm-dd",
  isoTime:        "HH:MM:ss",
  isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
  isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
exports.dateFormat.i18n = {
  dayNames: [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ],
  monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ]
};

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
};

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
  return parseInt(Math.random() * 0x7fffffff, 10);
};

/*
 * Creates a string identifier.
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
 * Creates an official looking long ass string identifier.
 */
exports.code = function (numSegments, maxSegmentLength) {
  numSegments = numSegments || 8;
  var code = '';
  var possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (var i = 0; i < numSegments; ++i) {
    var l = Math.floor(Math.random() * (maxSegmentLength || numSegments * 3));
    l = l || 1;
    for (var j = 0; j < l; ++j) {
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    if (i !== numSegments - 1) {
      code += '-';
    }
  }
  return code;
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

/*
 * Parse video URL from text.
 */
exports.parseVideoURL = function (url) {
  if (!url) {
    return false;
  }

  // Try Vimeo.
  var m = url.match(/vimeo.com\/(?:channels\/|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (m) {
    return {link: {
      id: m[3],
      type: 'vimeo'
    }};
  }

  // Try Youtube.
  m = url.match(/(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&"'>\s]+)/i);
  if (m) {
    return {link: {
      id: m[5],
      type: 'youtube'
    }};
  } else {
    return false;
  }
};

/*
 * Restrict characters to letters, numbers, periods, underscores
 * and a max length of 30.
 */
exports.toUsername = function (str) {
  if (str === null) {
    return '';
  }

  var from  = "ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżźĄÀÁÄÂÃÅÆĂĆĘÈÉËÊÌÍÏÎŁŃÒÓÖÔÕØŚȘȚÙÚÜÛÑÇŻŹ",
      to    = "aaaaaaaaaceeeeeiiiilnoooooosstuuuunczzAAAAAAAAACEEEEEIIIILNOOOOOOSSTUUUUNCZZ",
      regex = new RegExp('[' + from + ']', 'g');

  str = String(str).replace(regex, function (c) {
    var index = from.indexOf(c);
    return to.charAt(index) || '_';
  });

  return str.replace(/[^\w^\.]/g, '_').substr(0, 30);
};
