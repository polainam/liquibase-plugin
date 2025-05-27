const vscode = require('vscode');
const fs = require('fs');

async function configurePropertiesPath() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    let propertiesPath = config.get('propertiesPath');
    
    if (propertiesPath && fs.existsSync(propertiesPath)) {
        const result = await vscode.window.showInformationMessage(
            `Found existing liquibase.properties at: ${propertiesPath}. Would you like to use a different file?`,
            'Yes, change file', 'No, keep current file'
        );
        if (result !== 'Yes, change file') {
            return propertiesPath;
        }
    }
    
    const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Properties Files': ['properties'] },
        title: 'Select liquibase.properties file'
    });
    if (!fileUris || fileUris.length === 0) return null;
    
    propertiesPath = fileUris[0].fsPath;
    await config.update('propertiesPath', propertiesPath, true);
    return propertiesPath;
}

module.exports = configurePropertiesPath;
