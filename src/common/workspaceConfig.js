const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function getLiquibaseConfig() {
    return vscode.workspace.getConfiguration('liquibaseGenerator');
}

function getConfigValue(key, defaultValue = null) {
    const config = getLiquibaseConfig();
    return config.get(key, defaultValue);
}

async function updateConfigValue(key, value, global = true) {
    const config = getLiquibaseConfig();
    return await config.update(key, value, global);
}

async function getLiquibasePropertiesPath() {
    const config = getLiquibaseConfig();
    let propertiesPath = config.get('propertiesPath');
    
    if (!propertiesPath || !fs.existsSync(propertiesPath)) {
      const result = await vscode.window.showInformationMessage(
        'Path to liquibase.properties is not set or invalid. Would you like to set it now?',
        'Yes', 'No'
      );
      
      if (result !== 'Yes') {
        return null;
      }
      
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
      
      await config.update('propertiesPath', propertiesPath, true);
    }
    
    return propertiesPath;
}

function resolveTargetDirectory(uri) {
    if (uri && uri.fsPath) {
        const stats = fs.statSync(uri.fsPath);
        return stats.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
    }
    return null;
}

module.exports = {
    getLiquibaseConfig,
    getConfigValue,
    updateConfigValue,
    getLiquibasePropertiesPath,
    resolveTargetDirectory
}; 