/*
 * index.js: Island utils.
 *
 */

// Module Dependencies
var crypto = require('crypto');
var _ = require('underscore');
var oid = require('mongish').oid;

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
  _.each(obj, function (att) {
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
 * Deep clone an object.
 * http://stackoverflow.com/a/13333781/641834 (modified to handle MongoDB ObjectID)
 */
var deepClone = exports.deepClone = function (src, _visited, _copiesVisited) {
  if (src === null || typeof(src) !== 'object') {
    return src;
  }

  // Honor native/custom clone methods
  if (typeof src.clone == 'function') {
    return src.clone(true);
  }

  // Special cases:
  // ObjectID (MongoDB)
  if (oid.isValid(src)) {
    return oid(src.toString());
  }
  // Date
  if (src instanceof Date) {
    return new Date(src.getTime());
  }
  // RegExp
  if (src instanceof RegExp){
    return new RegExp(src);
  }

  // DOM Element
  if (src.nodeType && typeof src.cloneNode == 'function') {
    return src.cloneNode(true);
  }

  // Initialize the visited objects arrays if needed.
  // This is used to detect cyclic references.
  if (_visited === undefined) {
    _visited = [];
    _copiesVisited = [];
  }

  // Check if this object has already been visited
  var i, len = _visited.length;
  for (i = 0; i < len; i++) {
    // If so, get the copy we already made
    if (src === _visited[i]) {
      return _copiesVisited[i];
    }
  }

  // Array
  if (Object.prototype.toString.call(src) == '[object Array]') {
    // [].slice() by itself would soft clone
    ret = src.slice();

    // add it to the visited array
    _visited.push(src);
    _copiesVisited.push(ret);

    var i = ret.length;
    while (i--) {
      ret[i] = deepCopy(ret[i], _visited, _copiesVisited);
    }
    return ret;
  }

  // If we've reached here, we have a regular object

  // make sure the returned object has the same prototype as the original
  var proto = (Object.getPrototypeOf ? Object.getPrototypeOf(src): src.__proto__);
  if (!proto) {
    proto = src.constructor.prototype; // this line would probably only be reached by very old browsers
  }
  var dest = Object.create(proto);

  // add this object to the visited array
  _visited.push(src);
  _copiesVisited.push(dest);

  for (var key in src) {
    // Note: this does NOT preserve ES5 property attributes like 'writable', 'enumerable', etc.
    // For an example of how this could be modified to do so, see the singleMixin() function
    dest[key] = deepClone(src[key], _visited, _copiesVisited);
  }
  return dest;
}

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
  var possible
      = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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


/*
 * Filter for @atmentions
 */
exports.atmentions = function (str) {
  var re = /@(\S*)\b/g;
  var matches = [];
  var res;
  while ((res = re.exec(str)) !== null) {
    matches.push(res[1]);
  }
  return matches;
};
