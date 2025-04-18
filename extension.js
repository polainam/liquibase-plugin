const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBar/statusBarItem');
const { registerCompletionProviderXml } = require('./src/intellisense/xml/completionProviderXml');
const { generateSqlForChangeset, generateSqlForChangesetContextMenu } = require('./src/commands/generateSqlForChangeset');

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
    
    // Register command for context menu
    const generateSqlContextCommand = vscode.commands.registerCommand(
        'liquibase.generateChangesetSQLContext',
        generateSqlForChangesetContextMenu
    );
    context.subscriptions.push(generateSqlContextCommand);
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};