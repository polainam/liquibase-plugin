const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzerYaml');
const { getLiquibaseTags } = require('./liquibaseTagsYaml');

// Функция для проверки корректности отступа
function isIndentationValid(tagConfig, contextData, parentTag) {
    const { tagIndentations, currentIndentation } = contextData;
    const parentIndentation = parentTag ? tagIndentations[parentTag]?.indentation : 0;
    
    // Для корневого тега
    if (tagConfig.indentationRules.type === 'absolute') {
        return currentIndentation === tagConfig.indentationRules.spaces;
    }
    
    // Для относительных отступов
    if (tagConfig.indentationRules.type === 'relative') {
        const expectedIndentation = parentIndentation + tagConfig.indentationRules.spaces;
        
        // Для элементов списка нужно учитывать дополнительный отступ
        if (tagConfig.indentationRules.listItem) {
            // Проверяем, что текущий отступ равен ожидаемому
            return currentIndentation === expectedIndentation;
        } else {
            // Для обычных тегов
            return currentIndentation === expectedIndentation;
        }
    }
    
    return false;
}

// функция для регистрации провайдера автодополнений для работы с YAML
function registerCompletionProviderYaml(context) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "yaml", scheme: "file" },
        {
            provideCompletionItems(document, position) {
                // Добавляем отладочную информацию о позиции
                const line = document.lineAt(position.line);
                console.log('Completion requested at position:', {
                    line: position.line,
                    character: position.character,
                    lineContent: line.text,
                    trimmedLineContent: line.text.trim()
                });

                // Анализируем контекст
                const contextData = analyzeContext(document, position);
                
                // Отладочная информация
                console.log('YAML Context:', JSON.stringify(contextData));
                
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
                
                console.log('Filtered suggestions count:', filteredSuggestions.length);
                
                return filteredSuggestions;
            },
        }
    );

    context.subscriptions.push(provider);
}

module.exports = {
    registerCompletionProviderYaml,
}; 