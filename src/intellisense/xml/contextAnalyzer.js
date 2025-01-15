const vscode = require('vscode');
/**
 * Анализирует текущий документ и возвращает данные о контексте.
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns {Object} Контекстные данные
 */
function analyzeContext(document, position) {
    const lineText = document.lineAt(position).text;
    // исправить для введения контекстной зависимости тегов
    const isInsideDatabaseChangeLog = lineText.includes("<databaseChangeLog") && lineText.includes("</databaseChangeLog>");
    const isInsideChangeSet = lineText.includes("<changeSet");
    
    return {
        isInsideDatabaseChangeLog,
        isInsideChangeSet
    };}

module.exports = {
    analyzeContext,
};
