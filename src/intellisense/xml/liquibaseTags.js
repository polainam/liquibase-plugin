const vscode = require('vscode');

function getLiquibaseTags(contextData) {
    const tags = [
        {
            name: "databaseChangeLog",
            snippet: `<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog\n    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog\n        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">\n\t\${0}\n</databaseChangeLog>`,
            documentation: "Шаблон для Liquibase Changelog.",
            allowedIn: ["root"] // Разрешен только на корневом уровне
        },
        {
            name: "changeSet",
            snippet: `<changeSet id="\${1:unique-id}" author="\${2:author}">\n\t\${0}\n</changeSet>`,
            documentation: "Тег для описания изменений в базе данных.",
            allowedIn: ["databaseChangeLog"] // Разрешен только внутри databaseChangeLog
        },
        {
            name: "createTable",
            snippet: `<createTable tableName="\${1:table_name}">\n\t\${0}\n</createTable>`,
            documentation: "Создание новой таблицы в базе данных.",
            allowedIn: ["changeSet"] // Разрешен только внутри changeSet
        },
        {
            name: "column",
            snippet: `<column name="\${1:column_name}" type="\${2:column_type}">\n\t\${0}\n</column>`,
            documentation: "Определение колонки в таблице.",
            allowedIn: ["createTable"] // Разрешен только внутри createTable
        },
        {
            name: "constraints",
            snippet: `<constraints primaryKey="\${1:true|false}" nullable="\${2:true|false}" unique="\${3:true|false}" />`,
            documentation: "Ограничения для колонки (первичный ключ, nullable, уникальность).",
            allowedIn: ["column"] // Разрешен только внутри column
        }
    ];

    // Фильтрация подсказок на основе контекста
    const filteredTags = tags.filter(tag => {
        if (contextData.isInsideConstraints) {
            return;
        } else if (contextData.isInsideColumn) {
            return tag.allowedIn.includes("column");
        } else if (contextData.isInsideCreateTable) {
            return tag.allowedIn.includes("createTable");
        } else if (contextData.isInsideChangeSet) {
            return tag.allowedIn.includes("changeSet");
        } else if (contextData.isInsideDatabaseChangeLog) {
            return tag.allowedIn.includes("databaseChangeLog");
        } else {
            return tag.allowedIn.includes("root");
        }
    });

    return filteredTags.map(tag => {
        const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString(tag.snippet);
        item.documentation = tag.documentation;
        return item;
    });
}

module.exports = {
    getLiquibaseTags,
};
