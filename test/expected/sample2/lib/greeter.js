var chalk = require('chalk'),
    util = require('util');

function Greeter(greeting) {
  this.greeting = greeting || 'Hello';
}

module.exports = Greeter;

Greeter.prototype.greet = function(name) {
  return util.format('%s, %s', this.greeting, chalk.red(name || 'stranger'));
};

