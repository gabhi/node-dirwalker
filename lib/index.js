var _ = require('lodash'),
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    minimatch = require('minimatch'),
    path = require('path'),
    util = require('util'),
    splitter = /\s*[, ]\s*/;

module.exports = DirWalker;
util.inherits(DirWalker, EventEmitter);

/**
 * Construct a directory walker
 * @param options {object}
 *   - neverIgnore {array} glob patterns for files/paths to always include (overrides any ignore patterns)
 *   - defaultIgnore {array} glob patterns for files/paths to ignore by default
 *   - ignoreFiles {array} of strings; each string specifies a file to load for ignore rules; the string
 *     can include alternative files to load, separated by a space or comma
 *     For example: the following specifies to load patterns from .ignore and .npmignore, and if .npmignore
 *     is not found, attempt to load .gitignore instead
 *     ignoreFiles: [ '.ignore', '.npmignore, .gitignore' ]
 * @returns {DirWalker}
 * @constructor
 */
function DirWalker(options) {
  if (!(this instanceof DirWalker)) return new DirWalker(options);
  EventEmitter.call(this);
  this.options = options;
}

// ==============================================
// public methods
// ==============================================

/**
 * Walk the specified directory.
 *
 * Emits the following events:
 *   - 'entry' {object} pathname, basename, dirname, relname, type ('file' or 'directory')
 *   - 'error' {Error}
 *   - 'close'
 *
 * Note: relname is the relative pathname starting from dir
 *
 * @param dir
 * @param options {object}
 *   - recurse {boolean} recurse subdirectories; default=false
 *   - recursive {boolean} alias for recurse
 */
DirWalker.prototype.walk = function (dir, options) {
  options = options ? _.clone(options, true) : {};

  options.filters =_getDefaultIgnore.call(this);
  options.parent = null;

  _walk.call(this, dir, options, function() {
    _close.call(this);
  }.bind(this));

};

// ==============================================
// private methods
// ==============================================

function _getDefaultIgnore() {
  return this.options && this.options.defaultIgnore
      ? this.options.defaultIgnore
      : [];
}

function _getNeverIgnore() {
  return this.options && this.options.neverIgnore
      ? this.options.neverIgnore
      : [];
}

/**
 * For each directory, load any designated ignore files (for example,
 * .ignore, .npmignore, .gitignore, etc), then read directory entries
 * and apply loaded rules, plus any default configured rules for this
 * object.
 *
 * @param dir {string}
 * @param parent {string}
 * @param options {object}
 *   - recurse {boolean} recurse subdirectories; default=false
 *   - recursive {boolean} alias for recurse
 * @param callback (err)
 * @private
 */
function _walk(dir, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = { parent: '', filters: _getDefaultIgnore.call(this) }
  }
  var recurse = options.recurse || options.recursive,
      entries = [],
      entry,
      pathname,
      isDirectory,
      parent = options.parent || '';

  _loadIgnoreFiles.call(this, dir, function (err, filters) {
    if (err) return _error.call(this, err);

    var includes = _getNeverIgnore.call(this);
    filters = _.union(options.filters, filters);

    fs.readdir(dir, function (err, files) {
      if (err) return _error.call(this, err);

      async.eachSeries(
          files,

          function (file, cb) {
            pathname = path.join(dir, file);

            fs.stat(pathname, function (err, stats) {
              if (err) return cb(err);

              isDirectory = stats.isDirectory();

              entry = {
                basename: file,
                dirname: dir,
                pathname: pathname,
                relname: path.join(parent, file),
                type: isDirectory ? 'directory' : 'file',
                stats: stats
              };

              if (_alwaysInclude.call(this, entry, includes)) {
                //console.log('**** ALWAYS INCLUDE: ');
                //console.log(entry);
              } else if (_ignore.call(this, entry, filters)) {
                //console.log('**** IGNORE: ');
                //console.log(entry);
                return cb();
              }

              if (isDirectory && recurse) {
                //console.log('****** RECURSE: ' + entry.dirname);
                options = _.clone(options, true);
                options.parent = path.join(parent, entry.basename);
                options.filters = filters;
                return _walk.call(this, entry.pathname, options, cb);
              }

              if (stats.isFile()) {
                entries.push(entry);
                _entry.call(this, entry);
                //console.log(entry.pathname);
              }

              return cb();

            }.bind(this));

          }.bind(this),

          function (err) {
            if (err) _error.call(this, err);
            callback();

          }.bind(this));

    }.bind(this));

  }.bind(this));

}

/**
 * Emit error event to registered listeners
 * @param err
 * @private
 */
function _error(err) {
  this.emit('error', err);
};

/**
 * Emit close event to registered listeners
 * @private
 */
function _close() {
  this.emit('close');
};

/**
 * Emit entry event to registered listeners
 * @private
 */
function _entry(entry) {
  this.emit('entry', entry);
};

/**
 * Return true if entry should be ignored according to the default and
 * loaded rules.
 *
 * @param entry
 * @returns {boolean}
 * @private
 */
function _ignore(entry, filters) {
  var name = entry.type === 'directory' ? entry.basename + '/' : entry.basename;
  filters = filters || [];
  return _.some(filters, function (filter) {
    var match = minimatch(name, filter);
    //if (match) console.log('IGNORE: %s, %j', name, entry);
    return match;
  });
}

/**
 * Return true if entry should always be included regardless of ignore rules
 * Ex: the npm tool will always include package.json and README.*, even if
 * added to .npmignore or .gitignore, when publishing a package.
 *
 * @param entry {object}
 * @returns {boolean}
 * @private
 */
function _alwaysInclude(entry, includes) {
  includes = includes || [];

  return _.some(includes, function (filter) {
    return minimatch(entry.basename, filter);
  });
}


/**
 * Returns an array of all file/path GLOB patterns specified in files
 * loaded from this.ignoreFiles, or else an empty array.
 *
 * @param dir
 * @param callback
 * @returns {*}
 * @private
 */
function _loadIgnoreFiles(dir, callback) {
  if (!this.options || !this.options.ignoreFiles || !this.options.ignoreFiles.length) {
    // nothing to do, so return an empty array
    return callback(null, []);
  }

  // creates an array of the ignore files that exist (or their designated
  // alternatives, if those exist)
  async.mapSeries(
      this.options.ignoreFiles,

      function (ignoreFile, cb) {
        var files = ignoreFile.trim().split(splitter);

        // map to full pathnames
        files = files.map(function (file) {
          return path.join(dir, file);
        });

        // find first file in array that exists
        async.detectSeries(
            files,
            fs.exists,
            function (result) {
              return cb(null, result);
            }
        );

      }.bind(this),

      // load each of the final list of ignore files, and concatenate
      // into a single array of filters (file/path GLOB patterns)
      function (err, files) {
        if (err) return callback(err);

        async.concatSeries(
            files,
            function (file, cb) {
              if (!file) return cb();
              loadIgnoreFile(file, cb);
            },
            callback
        );
      }
  );

}

// ==============================================
// helper functions
// ==============================================

/**
 * Returns an array of file/path GLOB filter patterns contained in the specified file.
 * Empty and comment lines are filtered out.
 *
 * @param pathname {string} pathname to file
 * @param callback (err, filters)
 */
function loadIgnoreFile(pathname, callback) {
  function filter(data, cb) {
    data = data ? data.trim() : '';

    // replace carriage returns on windows
    data = data.replace(/[\r]/g, '');

    // split on newlines, reject empty or comment lines
    callback(null,
        _.reject(data.split('\n'), function (line) {
          return !line || /^#/.test(line);
        })
    );
  }

  fs.readFile(pathname, 'utf8', function (err, data) {
    if (err) return callback(null, []);
    return filter(data, callback);
  });
}

