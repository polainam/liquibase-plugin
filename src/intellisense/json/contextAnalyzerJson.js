const jsonc = require('jsonc-parser');
const { getIndentation } = require('../../common/textTemplates');

function analyzeContext(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const location = jsonc.getLocation(text, offset);
  const path = location.path;

  const lineText = document.lineAt(position.line).text;
  const currentIndentation = getIndentation(lineText);
  const hasDatabaseChangeLog = text.includes('"databaseChangeLog"');

  const activeTags = path.filter(p => typeof p === 'string' && p !== '');

  const tagIndentations = {};
  const lines = text.split(/\r?\n/);

  for (let i = 0; i <= position.line; i++) {
    const line = lines[i];
    const match = line.match(/"([^"]+)"\s*:/);
    if (match) {
      const tag = match[1];
      const indent = getIndentation(line);
      // если этот тег есть в activeTags, сохраним его отступ и номер строки
      if (activeTags.includes(tag)) {
        tagIndentations[tag] = {
          indentation: indent,
          lineNumber: i
        };
      }
    }
  }

  return {
    activeTags,
    tagIndentations,
    isRoot: activeTags.length === 0,
    hasDatabaseChangeLog,
    currentIndentation
  };
}

module.exports = {
  analyzeContext
};
