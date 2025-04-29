const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzerXml');
const { getLiquibaseTags } = require('./liquibaseTagsXml');

// функция для регистрации провайдера автодополнений для работы с XML
function registerCompletionProviderXml(context) {
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
    registerCompletionProviderXml,
};
