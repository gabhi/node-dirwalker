var assert = require('assert'),
    chalk = require('chalk'),
    Greeter = require('../lib/greeter'),
    util = require('util');

it('should work', function () {
  var salutation = 'Hello';
  var recipient = 'world';
  var expected = util.format('%s, %s', salutation, chalk.red(thing));

  var g = new Greeter(salutation);
  var actual = g.greet(recipient);

  assert.equal(actual, expected);
});