// extension.js
const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBar/statusBarItem');
const { registerCompletionProviderXml } = require('./src/intellisense/xml/completionProviderXml');
const { generateSqlForChangeset } = require('./src/commands/generateSqlForChangeset');
const { getLiquibasePropertiesPath } = require('./src/commands/generateSqlForChangeset');

function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    registerCompletionProviderXml(context);

    // Register command for command palette
    const generateSqlCommand = vscode.commands.registerCommand(
        'liquibase.generateChangesetSQL',
        generateSqlForChangeset
    );
    context.subscriptions.push(generateSqlCommand);

    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.setPropertiesPath', async () => {
          const propertiesPath = await getLiquibasePropertiesPath();
          if (propertiesPath) {
            vscode.window.showInformationMessage(`Liquibase properties path set to: ${propertiesPath}`);
          }
        })
      );
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};