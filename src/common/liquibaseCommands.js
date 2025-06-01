const path = require('path');

function createUpdateSqlCommand(propertiesPath, changeLogFile, searchPath) {
  return `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${changeLogFile}" --searchPath="${searchPath}" updateSql`;
}

function createLiquibaseCommand(propertiesPath, tempFilePath, workspaceFolder) {
  const tempFileName = path.basename(tempFilePath);
  const searchPath = `${path.dirname(tempFilePath)},${workspaceFolder}`;
  
  return createUpdateSqlCommand(propertiesPath, tempFileName, searchPath);
}

module.exports = {
  createUpdateSqlCommand,
  createLiquibaseCommand
};