const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzerJson');
const { getLiquibaseTags } = require('./liquibaseTagsJson');

/**
 * Проверяет корректность отступа для тега
 * @param {Object} tagConfig Конфигурация тега
 * @param {Object} contextData Данные контекста
 * @param {string} parentTag Родительский тег
 * @returns {boolean} Корректность отступа
 */
function isIndentationValid(tagConfig, contextData, parentTag) {
    const { tagIndentations, currentIndentation } = contextData;
    const parentIndentation = parentTag ? tagIndentations[parentTag]?.indentation : 0;
    
    if (tagConfig.indentationRules.type === 'absolute') {
        return currentIndentation === tagConfig.indentationRules.spaces;
    }
    
    if (tagConfig.indentationRules.type === 'relative') {
        const expectedIndentation = parentIndentation + tagConfig.indentationRules.spaces;
        return currentIndentation === expectedIndentation;
    }
    
    return false;
}

/**
 * Регистрирует провайдер автодополнения для JSON файлов
 * @param {vscode.ExtensionContext} context Контекст расширения VS Code
 */
function registerCompletionProviderJson(context) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "json", scheme: "file" },
        {
            provideCompletionItems(document, position) {
                // Добавляем отладочную информацию о позиции
                const line = document.lineAt(position.line);
                console.log('JSON Completion requested at position:', {
                    line: position.line,
                    character: position.character,
                    lineContent: line.text,
                    trimmedLineContent: line.text.trim()
                });

                // Анализируем контекст
                const contextData = analyzeContext(document, position);
                
                // Отладочная информация
                console.log('JSON Context:', JSON.stringify(contextData));
                
                // Получаем все возможные подсказки
                const allSuggestions = getLiquibaseTags(contextData);
                
                // Фильтруем подсказки по правилам отступов
                const filteredSuggestions = allSuggestions.filter(suggestion => {
                    // Получаем конфигурацию тега из команды
                    const tagConfig = suggestion.command?.arguments?.[0];
                    if (!tagConfig) return false;
                    
                    // Находим родительский тег (последний в списке активных тегов)
                    const parentTag = contextData.activeTags[contextData.activeTags.length - 1];
                    
                    // Проверяем корректность отступа
                    return isIndentationValid(tagConfig, contextData, parentTag);
                });
                
                console.log('JSON Filtered suggestions count:', filteredSuggestions.length);
                
                return filteredSuggestions;
            },
        }
    );

    context.subscriptions.push(provider);
}

module.exports = {
    registerCompletionProviderJson,
}; 