module.exports = [
    {
        name: "databaseChangeLog",
        snippet: "databaseChangeLog:\n  $0",
        documentation: "Корневой элемент для Liquibase Changelog.",
        allowedIn: ["root"],
        disallowedIn: [],
        indentationRules: {
            type: "absolute",  // абсолютный отступ от начала строки
            spaces: 0
        }
    },
    {
        name: "changeSet",
        snippet: "- changeSet:\n    id: ${1:unique-id}\n    author: ${2:author}\n    $0",
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["databaseChangeLog"],
        disallowedIn: ["changeSet"],
        indentationRules: {
            type: "relative",  // относительный отступ от родительского тега
            spaces: 2,
            listItem: true    // элемент списка (начинается с -)
        }
    },
    {
        name: "changes",
        snippet: "changes:\n    $0",
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["changeSet"],
        disallowedIn: ["changes"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    },
    {
        name: "createTable",
        snippet: "- createTable:\n    tableName: ${1:table_name}\n    $0",
        documentation: "Создание новой таблицы в базе данных.",
        allowedIn: ["changes"],
        disallowedIn: ["createTable"],
        indentationRules: {
            type: "relative",
            spaces: 2,
            listItem: true
        }
    },
    {
        name: "columns",
        snippet: "columns:\n    $0",
        documentation: "Список колонок таблицы.",
        allowedIn: ["createTable"],
        disallowedIn: ["columns"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    },
    {
        name: "column",
        snippet: "- column:\n    name: ${1:column_name}\n    type: ${2:column_type}\n    $0",
        documentation: "Определение колонки в таблице.",
        allowedIn: ["columns"],
        disallowedIn: ["column"],
        indentationRules: {
            type: "relative",
            spaces: 2,
            listItem: true
        }
    },
    {
        name: "constraints",
        snippet: "constraints:\n    primaryKey: ${1:true}\n    nullable: ${2:false}\n    unique: ${3:false}\n    $0",
        documentation: "Ограничения для колонки (первичный ключ, nullable, уникальность).",
        allowedIn: ["column"],
        disallowedIn: ["constraints"],
        indentationRules: {
            type: "relative",
            spaces: 4
        }
    }
]; 