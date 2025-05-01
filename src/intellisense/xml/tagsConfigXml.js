module.exports = [
    {
        name: "databaseChangeLog",
        snippet: `<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog\n    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog\n        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">\n\t\${0}\n</databaseChangeLog>`,
        documentation: "Шаблон для Liquibase Changelog.",
        allowedIn: ["root"], // Разрешен только на корневом уровне
        disallowedIn: [],
        indentationRules: {
            type: "absolute",
            spaces: 0
        }
    },
    {
        name: "changeSet",
        snippet: `<changeSet id="\${1:unique-id}" author="\${2:author}">\n\t\${0}\n</changeSet>`,
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["databaseChangeLog"], // Разрешен только внутри databaseChangeLog
        disallowedIn: ["changeSet"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    },
    {
        name: "createTable",
        snippet: `<createTable tableName="\${1:table_name}">\n\t\${0}\n</createTable>`,
        documentation: "Создание новой таблицы в базе данных.",
        allowedIn: ["changeSet"], // Разрешен только внутри changeSet
        disallowedIn: ["createTable"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    },
    {
        name: "column",
        snippet: `<column name="\${1:column_name}" type="\${2:column_type}">\n\t\${0}\n</column>`,
        documentation: "Определение колонки в таблице.",
        allowedIn: ["createTable"], // Разрешен только внутри createTable
        disallowedIn: ["column"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    },
    {
        name: "constraints",
        snippet: `<constraints primaryKey="\${1:true|false}" nullable="\${2:true|false}" unique="\${3:true|false}" />`,
        documentation: "Ограничения для колонки (первичный ключ, nullable, уникальность).",
        allowedIn: ["column"], // Разрешен только внутри column
        disallowedIn: ["constraints"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    }
];