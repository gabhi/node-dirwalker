var Greeter = require('./lib/greeter');

var greeter = new Greeter();

var greeting = greeter.greet(process.argv[2]);

console.log(greeting);

