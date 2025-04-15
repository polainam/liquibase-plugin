const vscode = require('vscode');
const tags = require('./tagsConfig');

function analyzeContext(document, position) {
  const fullText = document.getText();
  const offset = document.offsetAt(position);
  const textBeforeCursor = fullText.substring(0, offset);

  // Удалим все комментарии и переносы для стабильного парсинга
  const sanitizedText = textBeforeCursor.replace(/<!--[\s\S]*?-->/g, '').replace(/\r?\n/g, '');

  // Ищем, не находится ли курсор внутри открывающего/закрывающего тега
  const inTag = /<[^>]*$/.test(sanitizedText);
  if (inTag) {
    return {
      activeTags: [],
      isRoot: false,
      hasDatabaseChangeLog: fullText.includes('<databaseChangeLog'),
      inTag: true
    };
  }

  const tagStack = [];
  const tagRegex = /<([\/]?)(\w+)([^>]*)(\/?)>/g;
  let match;

  while ((match = tagRegex.exec(sanitizedText)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const isSelfClosing = match[4] === '/' || match[3].trim().endsWith('/');

    if (isSelfClosing) {
      // Игнорируем самозакрывающийся тег (например, <constraints ... />)
      continue;
    } else if (isClosing) {
      // Закрытие тега, убираем с вершины стека
      const index = tagStack.lastIndexOf(tagName);
      if (index !== -1) {
        tagStack.splice(index, 1);
      }
    } else {
      // Открытие тега
      tagStack.push(tagName);
    }
  }

  return {
    activeTags: tagStack,
    isRoot: tagStack.length === 0,
    hasDatabaseChangeLog: fullText.includes('<databaseChangeLog'),
    inTag: false
  };
}

module.exports = {
  analyzeContext
};
