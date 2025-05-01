const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzerXml');
const { getLiquibaseTags } = require('./liquibaseTagsXml');

/**
 * Проверяет корректность отступа для тега
 * @param {Object} tagConfig Конфигурация тега
 * @param {Object} contextData Данные контекста
 * @param {string} parentTag Родительский тег
 * @returns {boolean} Корректность отступа
 */
function isIndentationValid(tagConfig, contextData, parentTag) {
    const { tagIndentations, currentIndentation, isRoot } = contextData;
    
    console.log(`Checking indentation for tag ${tagConfig.name}:`, {
        currentIndentation,
        parentTag,
        indentationRules: tagConfig.indentationRules
    });
    
    // Если нет правил отступа, считаем что любой отступ недопустим
    if (!tagConfig.indentationRules) {
        return false;
    }
    
    // Для корневого тега (databaseChangeLog)
    if (tagConfig.name === 'databaseChangeLog') {
        // databaseChangeLog может быть только в корне документа с нулевым отступом
        if (isRoot && currentIndentation === 0) {
            return true;
        }
        return false;
    }
    
    // Если нет родительского тега, но это не корневой элемент - отказываем
    if (!parentTag && !isRoot) {
        return false;
    }
    
    // Проверяем, что родительский тег есть в списке разрешенных
    if (!tagConfig.allowedIn.includes(parentTag)) {
        console.log(`Parent tag ${parentTag} not in allowed list for ${tagConfig.name}`);
        return false;
    }
    
    // Для фиксированных отступов тегов внутри databaseChangeLog
    if (parentTag === 'databaseChangeLog' && tagConfig.name === 'changeSet') {
        // changeSet должен иметь отступ 4 внутри databaseChangeLog
        return currentIndentation === 4;
    }
    
    if (parentTag === 'changeSet' && tagConfig.name === 'createTable') {
        // createTable должен иметь отступ 8 внутри changeSet
        return currentIndentation === 8;
    }
    
    if (parentTag === 'createTable' && tagConfig.name === 'column') {
        // column должен иметь отступ 12 внутри createTable
        return currentIndentation === 12;
    }
    
    if (parentTag === 'column' && tagConfig.name === 'constraints') {
        // constraints должен иметь отступ 16 внутри column
        return currentIndentation === 16;
    }
    
    // Получаем отступ родительского тега
    const parentIndentation = parentTag && tagIndentations[parentTag] 
        ? tagIndentations[parentTag].indentation 
        : 0;
    
    // Проверяем отступ относительно родителя
    if (tagConfig.indentationRules.type === 'relative') {
        const expectedIndentation = parentIndentation + tagConfig.indentationRules.spaces;
        const isValid = currentIndentation === expectedIndentation;
        console.log(`Tag ${tagConfig.name} with indent ${currentIndentation} (expected: ${expectedIndentation}): ${isValid}`);
        return isValid;
    }
    
    // По умолчанию считаем отступ неверным
    return false;
}

// функция для регистрации провайдера автодополнений для работы с XML
function registerCompletionProviderXml(context) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "xml", scheme: "file" },
        {
            provideCompletionItems(document, position) {
                // Анализируем контекст
                const contextData = analyzeContext(document, position);
                console.log('XML Context:', JSON.stringify(contextData));
                
                // Получаем все возможные подсказки
                const allSuggestions = getLiquibaseTags(contextData);
                console.log('All suggestions count:', allSuggestions.length);
                
                // Если мы внутри тега, возвращаем все подсказки без учета отступов
                if (contextData.inTag) {
                    console.log('Inside tag, returning all suggestions');
                    return allSuggestions;
                }
                
                // Определяем ожидаемый отступ для текущего контекста
                let expectedIndentation = null;
                let validTags = [];
                
                // Если мы внутри databaseChangeLog с отступом 4, то ожидаем changeSet
                if (contextData.activeTags.includes('databaseChangeLog') && contextData.currentIndentation === 4) {
                    console.log('Inside databaseChangeLog with indent 4, expecting changeSet');
                    validTags = ['changeSet'];
                    expectedIndentation = 4;
                }
                // Если мы внутри changeSet с отступом 8, то ожидаем createTable
                else if (contextData.activeTags.includes('changeSet') && contextData.currentIndentation === 8) {
                    console.log('Inside changeSet with indent 8, expecting createTable');
                    validTags = ['createTable'];
                    expectedIndentation = 8;
                }
                // Если мы внутри createTable с отступом 12, то ожидаем column
                else if (contextData.activeTags.includes('createTable') && contextData.currentIndentation === 12) {
                    console.log('Inside createTable with indent 12, expecting column');
                    validTags = ['column'];
                    expectedIndentation = 12;
                }
                // Если мы внутри column с отступом 16, то ожидаем constraints
                else if (contextData.activeTags.includes('column') && contextData.currentIndentation === 16) {
                    console.log('Inside column with indent 16, expecting constraints');
                    validTags = ['constraints'];
                    expectedIndentation = 16;
                }
                // Если ни одно условие не сработало, но мы детектировали databaseChangeLog в документе
                // и отступ равен 4, то, вероятно, ожидается changeSet
                else if (contextData.hasDatabaseChangeLog && contextData.currentIndentation === 4) {
                    console.log('databaseChangeLog detected and indent is 4, expecting changeSet');
                    validTags = ['changeSet'];
                    expectedIndentation = 4;
                }
                
                // Если мы определили ожидаемый отступ и теги, фильтруем подсказки
                if (expectedIndentation !== null && validTags.length > 0) {
                    const strictFilteredSuggestions = allSuggestions.filter(suggestion => 
                        validTags.includes(suggestion.label));
                    
                    console.log(`Strictly filtered suggestions for indent ${expectedIndentation}: ${strictFilteredSuggestions.length}`);
                    
                    if (strictFilteredSuggestions.length > 0) {
                        return strictFilteredSuggestions;
                    }
                }
                
                // Если строгая фильтрация не сработала, применяем обычную фильтрацию по правилам отступов
                const filteredSuggestions = allSuggestions.filter(suggestion => {
                    const tagConfig = suggestion.command?.arguments?.[0];
                    if (!tagConfig) return false;
                    
                    const parentTag = contextData.activeTags.length > 0 
                        ? contextData.activeTags[contextData.activeTags.length - 1]
                        : (contextData.hasDatabaseChangeLog ? 'databaseChangeLog' : null);
                    
                    return isIndentationValid(tagConfig, contextData, parentTag);
                });
                
                console.log('Regular filtered suggestions count:', filteredSuggestions.length);
                
                // Если обычная фильтрация тоже не дала результатов, возвращаем пустой список
                // чтобы не показывать неподходящие подсказки
                if (filteredSuggestions.length === 0) {
                    console.log('No suggestions match indentation rules, returning empty list');
                    return [];
                }
                
                return filteredSuggestions;
            },
        }
    );

    context.subscriptions.push(provider);
}

module.exports = {
    registerCompletionProviderXml,
};
