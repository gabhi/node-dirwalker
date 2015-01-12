var _ = require('lodash'),
    assert = require('assert'),
    DirWalker = require('../lib'),
    path = require('path');

describe('dirwalker tests', function () {
  this.timeout(5 * 1000);

  var defaultIgnore = [
    // HACK: added node_modules for now since not handling bundledDependencies
    'node_modules/',
    '.*.swp',
    '_*',
    'DS_Store',
    '.git',
    '.hg',
    '.lock-wscript',
    '.svn',
    '.wafpickle-*',
    'CVS',
    'npm-debug.log'
  ];

  var neverIgnore = [
    'package.json',
    'README.*'
  ];

  var options = {
    // the single ignore entry string in the ignoreFiles array says to
    // attempt to load .npmignore; if not found, then attempt to load .gitignore
    ignoreFiles: ['.npmignore, .gitignore'],

    defaultIgnore: defaultIgnore,
    neverIgnore: neverIgnore
  };

  it('should honor .npmignore', function (done) {
    compareWalk('sample1', options, done);
  });

  it('should honor .gitignore', function (done) {
    // because .npmignore is missing, it should use .gitignore
    compareWalk('sample2', options, done);
  });

});


function compareWalk(dir, options, done) {
  // wait for walking the both the sample and the expected
  // directories to finish before comparing results
  var finished = _.after(2, function () {
    assert(_.isEqual(walkers.test.results, walkers.compare.results));
    done();
  });

  // configure the walkers
  var walkers = {
    test: {
      instance: DirWalker(options),
      dir: path.join(__dirname, 'samples', dir),
      errors: [],
      results: []
    },
    compare: {
      instance: DirWalker(),
      dir: path.join(__dirname, 'expected', dir),
      errors: [],
      results: []
    }
  };

  Object.keys(walkers).forEach(function (key) {
    var walker = walkers[key];

    walker.instance
        .on('entry', function (entry) {
          // entry.relname is the relative pathname starting from source dir;
          // this makes it easy to compare actual with expected entries
          //console.log('%s', entry.relname);
          walker.results.push(entry.relname);
        })
        .on('error', function (err) {
          console.log(err);
          walker.errors.push(err);
        })
        .on('close', function () {
          if (walker.errors.length) {
            return done(new Error('there were errors'));
          }
          finished();
        });

    walker.instance.walk(walker.dir, {recurse: true});
  });
}

