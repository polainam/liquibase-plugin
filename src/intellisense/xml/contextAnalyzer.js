const vscode = require('vscode');
const tags = require('./tagsConfig');

function analyzeContext(document, position) {
    const fullText = document.getText();
    const range = new vscode.Range(new vscode.Position(0, 0), position);
    const textBeforeCursor = document.getText(range);

    const hasDatabaseChangeLog = fullText.includes('<databaseChangeLog');

    // Определяем все активные теги в текущей позиции
    const activeTags = tags.filter(tag => {
        const lastOpen = textBeforeCursor.lastIndexOf(`<${tag.name}`);
        const lastClose = textBeforeCursor.lastIndexOf(`</${tag.name}>`);
        return lastOpen !== -1 && (lastClose === -1 || lastClose < lastOpen);
    }).map(tag => tag.name);

    return {
        activeTags, // Список тегов, внутри которых находится курсор
        isRoot: activeTags.length === 0, // Находится ли на корневом 
        hasDatabaseChangeLog
    };
}

module.exports = {
    analyzeContext,
};
