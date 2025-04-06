const vscode = require('vscode');
const tags = require('./tagsConfig');

function getLiquibaseTags(contextData) {

    const { activeTags, isRoot, hasDatabaseChangeLog } = contextData;

    return tags.filter(tag => {
        // Если это databaseChangeLog и он уже есть в документе - исключаем
        if (tag.name === 'databaseChangeLog' && hasDatabaseChangeLog) {
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

        return isAllowed && !isDisallowed;
    }).map(tag => {
        const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(tag.snippet);
        item.documentation = tag.documentation;
        return item;
    });
}

module.exports = {
    getLiquibaseTags,
};
