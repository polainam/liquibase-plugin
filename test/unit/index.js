const Mocha = require('mocha');
const glob = require('glob');
const path = require('path');

// Create the Mocha test runner
const mocha = new Mocha({
  ui: 'bdd',
  color: true
});

// Get all test files
const testFiles = glob.sync('**/*.test.js', { cwd: path.join(__dirname) });

// Add the test files to the runner
testFiles.forEach(file => {
  mocha.addFile(path.join(__dirname, file));
});

// Run the tests
mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
}); 