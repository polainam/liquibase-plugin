// подключение API
const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBar/statusBarItem');
const { registerCompletionProviderXml } = require('./src/intellisense/xml/completionProviderXml');
const { generateSqlForChangeset } = require('./src/commands/generateSqlForChangeset');

function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    registerCompletionProviderXml(context);

    const generateSqlCommand = vscode.commands.registerCommand(
        'liquibase.generateChangesetSQL',
        generateSqlForChangeset
    );
    context.subscriptions.push(generateSqlCommand);
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};
