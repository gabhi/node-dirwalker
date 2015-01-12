node-dirwalker [![Build Status](https://travis-ci.org/tonypujals/node-dirwalker.svg?branch=master)](https://travis-ci.org/tonypujals/node-dirwalker)
==============

[![NPM](https://nodei.co/npm/node-dirwalker.png)](https://nodei.co/npm/node-dirwalker/)

Walk directories filtering out any entries that match file/path glob patterns
designated by ignore files. Specify any file/path entries that must *always*
be included.

`dirwalker` allows you to walk a directory similar to the way other tools, such
as `npm` and `git` do.

For example, `npm publish` follows various rules. If there is an `.npmignore` file,
it will load the ignore rules from it; if it can't find .npmignore, it will load
the .gitignore file. Regardless of the loaded rules, with `npm publish`:

 * certain files are never ignored (`package.json`, `README.*`)
 * certain files/paths do not need to be mentioned and will be ignored by default
   (for example, `node_modules/`)
 * some files that are ignored might be overridden by custom logic (although
   `node_modules` is automatically ignored, `npm publish` will still include
   installed dependencies that are specified in package.json `bundledDependencies`)


Install
-------

    npm install node-dirwalker


Usage
-----

```
var DirWalker = require('node-dirwalker'),
    options = { ... };

var walker = DirWalker(options);

  walker
    .on('entry', function (entry) {
      console.log(entry);
    })
    .on('error', function (err) {
      console.log(err);
    })
    .on('close', function () {
      // done
    });

walker.walk(dir, {recurse: true});
```

Example
-------
The following demonstrates configuring a walker like `npm publish`.

```
var DirWalker = require('node-dirwalker');

var options = {
  // ignoreFiles is an array of ignore filenames (ex: .ignore) to load.
  // For a given filename, you can specify a list of alternative filenames
  // to look for using commas or spaces as a delimiter.
  // The following single ignore entry string in the ignoreFiles array says to
  // attempt to load .npmignore; if not found, then attempt to load .gitignore
  ignoreFiles: ['.npmignore, .gitignore'],

  // the following ignore rules will be in effect even if not explicitly specified
  // in any ignore file
  defaultIgnore: [
    // HACK: added node_modules for now since current version doesn't handle bundledDependencies
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
  ],

  // regardless of any rules, the following files in any directory (or sub-directory)
  // will never be ignored
  neverIgnore: [
    'package.json',
    'README.*'
  ]
};

var walker = DirWalker(options);

  walker
    .on('entry', function (entry) {
      console.log(entry);
    })
    .on('error', function (err) {
      console.log(err);
    })
    .on('close', function () {
      // done
    });

walker.walk(dir, {recurse: true});
```




