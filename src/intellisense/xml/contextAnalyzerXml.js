const vscode = require('vscode');

function analyzeContext(document, position) {
  const fullText = document.getText();
  const offset = document.offsetAt(position);
  const textBeforeCursor = fullText.substring(0, offset);
  const lineNumber = position.line;
  const lines = fullText.split('\n');
  const currentLineText = lines[lineNumber] || '';
  const currentIndentation = getIndentation(currentLineText);

  console.log('Analyzing XML at line:', lineNumber);
  console.log('Current indentation:', currentIndentation);
  console.log('Current line text:', currentLineText.trim());

  // Проверяем наличие databaseChangeLog в документе
  const hasDatabaseChangeLog = fullText.includes('<databaseChangeLog');

  // Удалим все комментарии для стабильного парсинга
  const sanitizedText = textBeforeCursor.replace(/<!--[\s\S]*?-->/g, '');

  // Ищем, не находится ли курсор внутри открывающего/закрывающего тега
  const inTag = /<[^>]*$/.test(sanitizedText);
  if (inTag) {
    return {
      activeTags: [],
      isRoot: false,
      hasDatabaseChangeLog,
      inTag: true,
      currentIndentation
    };
  }

  // Формат: [{tag: 'tagName', indentation: number, lineNumber: number}, ...]
  const hierarchyItems = [];
  const tagStack = [];
  let sanitizedLines = sanitizedText.split('\n');

  // Первый проход: собираем все теги и их уровни вложенности
  let multilineTagOpened = false;
  let multilineTagName = '';
  let multilineIndentation = 0;
  let multilineTagLine = 0;
  
  for (let i = 0; i < sanitizedLines.length; i++) {
    const line = sanitizedLines[i];
    const trimmedLine = line.trim();
    const indentation = getIndentation(line);
    
    // Если мы в процессе обработки многострочного открывающего тега
    if (multilineTagOpened) {
      // Проверяем, закрывается ли многострочный тег на текущей строке
      if (trimmedLine.includes('>')) {
        multilineTagOpened = false;
        tagStack.push(multilineTagName);
        hierarchyItems.push({
          tag: multilineTagName,
          indentation: multilineIndentation,
          lineNumber: multilineTagLine
        });
        console.log(`Line ${i}: Completed multiline opening tag "${multilineTagName}" with indentation ${multilineIndentation}`);
      }
      continue;
    }
    
    // Обрабатываем открытие многострочного тега
    const multilineOpenMatch = trimmedLine.match(/^<(\w+)(?![^<]*\/>)(?![^<]*>)/);
    if (multilineOpenMatch) {
      multilineTagOpened = true;
      multilineTagName = multilineOpenMatch[1];
      multilineIndentation = indentation;
      multilineTagLine = i;
      console.log(`Line ${i}: Started multiline opening tag "${multilineTagName}"`);
      continue;
    }
    
    // Находим открывающие теги в строке (но не самозакрывающиеся)
    const openTagRegex = /<(\w+)(?![^>]*\/>)[^>]*>/g;
    let openMatch;
    
    while ((openMatch = openTagRegex.exec(trimmedLine)) !== null) {
      const tagName = openMatch[1];
      tagStack.push(tagName);
      hierarchyItems.push({
        tag: tagName,
        indentation: indentation,
        lineNumber: i
      });
      console.log(`Line ${i}: Found opening tag "${tagName}" with indentation ${indentation}`);
    }
    
    // Находим закрывающие теги в строке
    const closeTagRegex = /<\/(\w+)>/g;
    let closeMatch;
    
    while ((closeMatch = closeTagRegex.exec(trimmedLine)) !== null) {
      const tagName = closeMatch[1];
      const stackIndex = tagStack.lastIndexOf(tagName);
      
      if (stackIndex !== -1) {
        tagStack.splice(stackIndex, 1);
        
        // Находим и удаляем соответствующий элемент из иерархии
        for (let j = hierarchyItems.length - 1; j >= 0; j--) {
          if (hierarchyItems[j].tag === tagName) {
            // Удаляем этот элемент из иерархии
            hierarchyItems.splice(j, 1);
            break;
          }
        }
      }
      
      console.log(`Line ${i}: Found closing tag "${tagName}"`);
    }
    
    // Обрабатываем самозакрывающиеся теги (они не влияют на стек)
    const selfClosingTagRegex = /<(\w+)[^>]*\/>/g;
    let selfClosingMatch;
    
    while ((selfClosingMatch = selfClosingTagRegex.exec(trimmedLine)) !== null) {
      const tagName = selfClosingMatch[1];
      console.log(`Line ${i}: Found self-closing tag "${tagName}"`);
    }
  }

  // Создаем объект с отступами для активных тегов
  const tagIndentations = {};
  hierarchyItems.forEach(item => {
    tagIndentations[item.tag] = {
      indentation: item.indentation,
      lineNumber: item.lineNumber
    };
  });
  
  // Специальный случай: если мы внутри databaseChangeLog, но он не был правильно обнаружен
  const isInsideDatabaseChangeLog = hasDatabaseChangeLog && !tagStack.includes('databaseChangeLog');
  
  console.log('XML Hierarchy:', hierarchyItems);
  console.log('Tag stack:', tagStack);
  console.log('Tag indentations:', tagIndentations);
  console.log('Is inside databaseChangeLog:', isInsideDatabaseChangeLog);

  return {
    activeTags: tagStack,
    tagIndentations,
    isRoot: tagStack.length === 0,
    hasDatabaseChangeLog,
    inTag: false,
    currentIndentation,
    isInsideDatabaseChangeLog
  };
}

/**
 * Получает уровень отступа строки
 * @param {string} line Строка текста
 * @returns {number} Количество пробелов в отступе
 */
function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

module.exports = {
  analyzeContext
};
