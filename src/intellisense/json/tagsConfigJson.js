module.exports = [
    {
        name: "databaseChangeLog",
        snippet: "{\n  \"databaseChangeLog\": [\n    $0\n  ]\n}",
        documentation: "Корневой элемент для Liquibase Changelog в JSON формате.",
        allowedIn: ["root"],
        disallowedIn: [],
        indentationRules: {
            type: "absolute",
            spaces: 0
        }
    },
    {
        name: "changeSet",
        snippet: "{\n  \"changeSet\": {\n    \"id\": \"${1:unique-id}\",\n    \"author\": \"${2:author}\"\n    $0\n  }\n},",
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["databaseChangeLog"],
        disallowedIn: ["changeSet"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    },
    {
        name: "changes",
        snippet: "\"changes\": [\n  $0\n]",
        documentation: "Массив изменений в базе данных.",
        allowedIn: ["changeSet"],
        disallowedIn: ["changes"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    },
    {
        name: "createTable",
        snippet: "{\n  \"createTable\": {\n    \"tableName\": \"${1:table_name}\",\n    $0\n  }\n},",
        documentation: "Создание новой таблицы в базе данных.",
        allowedIn: ["changes"],
        disallowedIn: ["createTable"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    },
    {
        name: "columns",
        snippet: "\"columns\": [\n  $0\n]",
        documentation: "Список колонок таблицы.",
        allowedIn: ["createTable"],
        disallowedIn: ["columns"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    },
    {
        name: "column",
        snippet: "{\n  \"column\": {\n    \"name\": \"${1:column_name}\",\n    \"type\": \"${2:column_type}\"\n    $0\n  }\n},",
        documentation: "Определение колонки в таблице.",
        allowedIn: ["columns"],
        disallowedIn: ["column"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    },
    {
        name: "constraints",
        snippet: "\"constraints\": {\n  \"primaryKey\": ${1:true},\n  \"nullable\": ${2:false},\n  \"unique\": ${3:false}\n  $0\n}",
        documentation: "Ограничения для колонки (первичный ключ, nullable, уникальность).",
        allowedIn: ["column"],
        disallowedIn: ["constraints"],
        indentationRules: {
            type: "relative",
            spaces: 2
        }
    }
]; 