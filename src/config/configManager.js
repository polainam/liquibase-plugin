// Configuration and settings management

const vscode = require('vscode');
const fs = require('fs');

/**
 * Gets the path to liquibase.properties file
 * @returns {Promise<string|null>} Path to the properties file or null
 */
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
  getLiquibasePropertiesPath
};