const cp = require('child_process');
const path = require('path');

function runLiquibase(propertiesPath, tempFilePath, workspaceFolder) {
  const tempFileName = path.basename(tempFilePath);

  const liquibaseCmd = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${path.dirname(tempFilePath)},${workspaceFolder}" updateSql`;

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
