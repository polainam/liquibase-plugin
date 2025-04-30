const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBar/statusBarItem');
const { registerCompletionProviderXml } = require('./src/xml/intellisense/completionProviderXml');
const { registerCompletionProviderYaml } = require('./src/yaml/intellisense/completionProviderYaml');
const { generateSqlForChangeset } = require('./src/liquibaseRunner');
const { getLiquibasePropertiesPath } = require('./src/configManager');

function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    registerCompletionProviderXml(context);
    registerCompletionProviderYaml(context);

    // Register commands for SQL generation
    let fullSqlDisposable = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSql', 
        () => generateSqlForChangeset(false)
    );
    
    let contextualSqlDisposable = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSqlFromContext', 
        () => generateSqlForChangeset(true)
    );
    
    context.subscriptions.push(fullSqlDisposable);
    context.subscriptions.push(contextualSqlDisposable);

    // Register command to set properties path
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