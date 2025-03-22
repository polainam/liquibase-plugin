const vscode = require('vscode');

function analyzeContext(document, position) {
    // Получаем диапазон от начала документа до позиции курсора
    const range = new vscode.Range(new vscode.Position(0, 0), position);
    // Получаем весь текст до курсора
    const textBeforeCursor = document.getText(range);

    // Проверяем, находимся ли мы внутри тега databaseChangeLog
    const isInsideDatabaseChangeLog = textBeforeCursor.includes("<databaseChangeLog") && !textBeforeCursor.includes("</databaseChangeLog>");

    // Проверяем, находимся ли мы внутри тега changeSet
    const isInsideChangeSet = textBeforeCursor.includes("<changeSet") && !textBeforeCursor.includes("</changeSet>");

    const isInsideCreateTable = (() => {
        // Проверяем, что находимся внутри <createTable>
        const isInsideCreateTableTag = textBeforeCursor.includes("<createTable") && !textBeforeCursor.includes("</createTable>");
        if (!isInsideCreateTableTag) return false;
    
        // Проверяем, что курсор не находится внутри <column> или <constraints>
        const isInsideColumn = (() => {
            const lastOpenColumnIndex = textBeforeCursor.lastIndexOf("<column");
            const lastCloseColumnIndex = textBeforeCursor.lastIndexOf("</column>");
            return lastOpenColumnIndex !== -1 && (lastCloseColumnIndex === -1 || lastCloseColumnIndex < lastOpenColumnIndex);
        })();
    
        const isInsideConstraints = (() => {
            const lastOpenConstraintsIndex = textBeforeCursor.lastIndexOf("<constraints");
            const lastCloseConstraintsIndex = textBeforeCursor.lastIndexOf("</constraints>");
            return lastOpenConstraintsIndex !== -1 && (lastCloseConstraintsIndex === -1 || lastCloseConstraintsIndex < lastOpenConstraintsIndex);
        })();
    
        return !isInsideColumn && !isInsideConstraints;
    })();

    // Проверяем, находимся ли мы внутри тега column
    const isInsideColumn = (() => {
        // Находим индекс последнего открывающего тега <column>
        const lastOpenColumnIndex = textBeforeCursor.lastIndexOf("<column");
        if (lastOpenColumnIndex === -1) return false; // Если тег <column> не найден
    
        // Находим индекс последнего закрывающего тега </column>
        const lastCloseColumnIndex = textBeforeCursor.lastIndexOf("</column>");
    
        // Если закрывающий тег </column> не найден или находится раньше открывающего, то курсор внутри <column>
        return lastCloseColumnIndex === -1 || lastCloseColumnIndex < lastOpenColumnIndex;
    })();

    const isInsideConstraints = (() => {
        // Проверяем, что находимся внутри <constraints>
        const lastOpenConstraintsIndex = textBeforeCursor.lastIndexOf("<constraints");
        const lastCloseConstraintsIndex = textBeforeCursor.lastIndexOf("</constraints>");
    
        // Если открывающий тег <constraints> найден, и закрывающий тег отсутствует или находится раньше открывающего
        return lastOpenConstraintsIndex !== -1 && (lastCloseConstraintsIndex === -1 || lastCloseConstraintsIndex < lastOpenConstraintsIndex);
    })();
    
    return {
        isInsideDatabaseChangeLog,
        isInsideChangeSet,
        isInsideCreateTable,
        isInsideColumn,
        isInsideConstraints
    };}

module.exports = {
    analyzeContext,
};
