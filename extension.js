const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBar/statusBarItem');
const { registerCompletionProvider } = require('./src/intellisense/xml/completionProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    registerCompletionProvider(context);
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};
