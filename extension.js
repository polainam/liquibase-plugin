const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/statusBarItems');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Создаем элемент статусной строки
    const generalStatusBarItem = createGeneralStatusBarItem();

    // Добавляем его в контекст для автоматической очистки при отключении расширения
    context.subscriptions.push(generalStatusBarItem);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
