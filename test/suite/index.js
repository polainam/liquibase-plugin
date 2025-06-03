const path = require('path');
const Mocha = require('mocha');
const { glob } = require('glob');

// Глобальные функции Mocha для тестов
global.describe = Mocha.describe;
global.it = Mocha.it;
global.before = Mocha.before;
global.after = Mocha.after;
global.beforeEach = Mocha.beforeEach;
global.afterEach = Mocha.afterEach;

function run() {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'bdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');
  
  return new Promise((resolve, reject) => {
    // Add all files to the test suite
    glob('unit/**/*.test.js', { cwd: testsRoot })
      .then(files => {
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Run the mocha test
          mocha.run(failures => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error(err);
          reject(err);
        }
      })
      .catch(err => {
        reject(err);
      });
  });
}

module.exports = {
  run
}; 