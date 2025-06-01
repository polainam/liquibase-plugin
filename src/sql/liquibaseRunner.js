const cp = require('child_process');
const path = require('path');
const { createLiquibaseCommand } = require('../common/liquibaseCommands');

function runLiquibase(propertiesPath, tempFilePath, workspaceFolder) {
  const liquibaseCmd = createLiquibaseCommand(propertiesPath, tempFilePath, workspaceFolder);

  return new Promise((resolve, reject) => {
    cp.exec(liquibaseCmd, { cwd: workspaceFolder }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = { runLiquibase };
