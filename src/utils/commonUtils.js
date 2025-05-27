const fs = require('fs');
const path = require('path');
const os = require('os');
const vscode = require('vscode');

function extractVariablesFromPattern(pattern) {
  const matches = pattern.match(/\{([^}]+)\}/g) || [];
  return matches.map(match => match.slice(1, -1));
}

function getUpdatedChangelogContent(format, parentContent, relativePath) {
  switch (format) {
      case 'xml':
          return parentContent.replace(
              /<\/databaseChangeLog>\s*$/,
              `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
          );

      case 'yaml':
      case 'yml':
          return parentContent + `\n  - include:\n      file: ${relativePath}\n`;

      case 'json': {
          const jsonObj = JSON.parse(parentContent);
          if (Array.isArray(jsonObj.databaseChangeLog)) {
              jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
              return JSON.stringify(jsonObj, null, 2);
          } else {
              throw new Error('Invalid parent changelog JSON structure');
          }
      }

      default:
          throw new Error(`Unsupported format for parent changelog: ${format}`);
  }
}

async function getLiquibasePropertiesPath() {
    // Try to get the path from settings
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    let propertiesPath = config.get('propertiesPath');
    
    // If not set or file doesn't exist, prompt the user
    if (!propertiesPath || !fs.existsSync(propertiesPath)) {
      const result = await vscode.window.showInformationMessage(
        'Path to liquibase.properties is not set or invalid. Would you like to set it now?',
        'Yes', 'No'
      );
      
      if (result !== 'Yes') {
        return null;
      }
      
      // Open a file dialog to select the properties file
      const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
          'Properties Files': ['properties']
        },
        title: 'Select liquibase.properties file'
      });
      
      if (!fileUris || fileUris.length === 0) {
        return null;
      }
      
      propertiesPath = fileUris[0].fsPath;
      
      // Save the path to settings
      await config.update('propertiesPath', propertiesPath, true);
    }
    
    return propertiesPath;
}

module.exports = {
  extractVariablesFromPattern,
  getUpdatedChangelogContent,
  getLiquibasePropertiesPath
};