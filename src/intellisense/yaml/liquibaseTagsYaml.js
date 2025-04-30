const vscode = require('vscode');
const tags = require('./tagsConfigYaml');

function getLiquibaseTags(contextData) {
    const { activeTags, isRoot, hasDatabaseChangeLog, currentIndentation } = contextData;
    
    console.log('Active Tags:', activeTags);
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

    console.log('Filtered tags count:', filteredTags.length);

    return filteredTags.map(tag => {
        // Создаем объект CompletionItem с дополнительными данными
        const item = new vscode.CompletionItem({
            label: tag.name,
            description: tag.documentation,
            detail: `Liquibase ${tag.name} tag`,
        });

        // Устанавливаем тип элемента как сниппет
        item.kind = vscode.CompletionItemKind.Snippet;
        
        // Устанавливаем текст для вставки
        item.insertText = new vscode.SnippetString(tag.snippet);
        
        // Устанавливаем документацию
        item.documentation = new vscode.MarkdownString(tag.documentation);

        // Сохраняем конфигурацию тега в userData
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