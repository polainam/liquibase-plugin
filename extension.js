const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "liquibase-plugin" is now active!');

	const disposable = vscode.commands.registerCommand('liquibase-plugin.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from liquibase-plugin!');
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
