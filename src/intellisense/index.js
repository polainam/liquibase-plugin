const vscode = require('vscode');

const { registerCompletionProviderXml } = require('./xml/completionProviderXml');
const { registerCompletionProviderYaml } = require('./yaml/completionProviderYaml');
const { registerCompletionProviderJson } = require('./json/completionProviderJson');

/**
 * Регистрирует все провайдеры автодополнения для разных форматов
 * @param {vscode.ExtensionContext} context Контекст расширения VS Code
 */
function registerAllCompletionProviders(context) {
    registerCompletionProviderXml(context);
    registerCompletionProviderYaml(context);
    registerCompletionProviderJson(context);
}

module.exports = {
    registerAllCompletionProviders,
    registerCompletionProviderXml,
    registerCompletionProviderYaml,
    registerCompletionProviderJson
}; 