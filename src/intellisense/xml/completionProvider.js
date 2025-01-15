const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzer');
const { getLiquibaseTags } = require('./liquibaseTags');

/**
 * Регистрирует провайдер подсказок IntelliSense.
 * @param {vscode.ExtensionContext} context 
 */
function registerCompletionProvider(context) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "xml", scheme: "file" },
        {
            provideCompletionItems(document, position) {
                // Анализируем контекст
                const contextData = analyzeContext(document, position);

                // Получаем подсказки на основе контекста
                return getLiquibaseTags(contextData);
            },
        }
    );

    context.subscriptions.push(provider);
}

module.exports = {
    registerCompletionProvider,
};
