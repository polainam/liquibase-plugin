const vscode = require('vscode');
/**
 * Возвращает подсказки для Liquibase XML на основе контекста.
 * @param {Object} contextData 
 * @returns {Array<vscode.CompletionItem>}
 */
function getLiquibaseTags(contextData) {
    const tags = [
        {
            name: "changeSet",
            snippet: `<changeSet id="\${1:unique-id}" author="\${2:author}">\n\t\${0}\n</changeSet>`,
            documentation: "Тег для описания изменений в базе данных."
        },
        {
            name: "rollback",
            snippet: `<rollback>\${1}</rollback>`,
            documentation: "Тег для описания откатов."
        },
                {
            name: "databaseChangeLog",
            snippet: `<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog\n    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog\n        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">\n\t\${0}\n</databaseChangeLog>`,
            documentation: "Шаблон для Liquibase Changelog."
        }
    ];

    return tags.map(tag => {
        const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(tag.snippet);
        item.documentation = tag.documentation;
        return item;
    });
}

module.exports = {
    getLiquibaseTags,
};
