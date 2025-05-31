const vscode = require('vscode');
const tags = require('./tagsConfigJson');

function getLiquibaseTags(contextData) {
    const { activeTags, isRoot, hasDatabaseChangeLog, currentIndentation } = contextData;
    
    console.log('JSON Active Tags:', activeTags);
    console.log('Is Root:', isRoot);
    console.log('Has DatabaseChangeLog:', hasDatabaseChangeLog);

    // Полная фильтрация с отладкой
    const filteredTags = tags.filter(tag => {
        // Если это databaseChangeLog и он уже есть в документе - исключаем
        if (tag.name === 'databaseChangeLog' && hasDatabaseChangeLog) {
            console.log(`${tag.name}: Отклонен - databaseChangeLog уже существует`);
            return false;
        }

        // Проверяем разрешённые контексты
        const isAllowed = isRoot 
            ? tag.allowedIn.includes("root")
            : tag.allowedIn.some(parentTag => activeTags.includes(parentTag));

        // Проверяем запрещённые контексты
        const isDisallowed = tag.disallowedIn.some(
            forbiddenTag => activeTags.includes(forbiddenTag)
        );

        const result = isAllowed && !isDisallowed;
        console.log(`${tag.name}: ${result ? 'Разрешен' : 'Отклонен'} - allowedIn: ${tag.allowedIn}, activeTags: ${activeTags}`);
        
        return result;
    });

    console.log('JSON Filtered tags count:', filteredTags.length);

    return filteredTags.map(tag => {
        const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(tag.snippet);
        item.documentation = new vscode.MarkdownString(tag.documentation);
        // Сохраняем конфигурацию тега в команде
        item.command = {
            command: 'liquibase.storeTagConfig',
            title: 'Store Tag Config',
            arguments: [tag]
        };
        return item;
    });
}

module.exports = {
    getLiquibaseTags,
}; 