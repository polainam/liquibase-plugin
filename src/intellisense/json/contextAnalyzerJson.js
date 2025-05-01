const vscode = require('vscode');

/**
 * Анализирует контекст JSON-документа для определения текущего положения в структуре
 * @param {vscode.TextDocument} document Документ VS Code
 * @param {vscode.Position} position Позиция курсора
 * @returns {Object} Информация о контексте
 */
function analyzeContext(document, position) {
  const fullText = document.getText();
  const lineNumber = position.line;
  const lines = fullText.split(/\r?\n/);
  
  // Отладочная информация
  console.log('Analyzing JSON at line:', lineNumber);
  
  // Проверка наличия databaseChangeLog в документе
  const hasDatabaseChangeLog = fullText.includes('"databaseChangeLog"');

  // Если документ пуст, возвращаем базовый контекст
  if (fullText.trim() === '') {
    return {
      activeTags: [],
      tagIndentations: {},
      isRoot: true,
      hasDatabaseChangeLog: false,
      currentIndentation: 0
    };
  }

  // Текущая строка и её отступ
  const currentLineText = lines[lineNumber] || '';
  const currentIndentation = getIndentation(currentLineText);
  
  // Для построения иерархии используем массив
  // Формат: [{tag: 'tagName', indentation: number, lineNumber: number}, ...]
  const hierarchyItems = [];
  
  try {
    // Пытаемся распарсить JSON для определения структуры
    // Однако это может быть невозможно, если документ неполный или с ошибками
    // Поэтому также выполняем анализ по строкам

    // Анализируем все строки до текущей позиции
    for (let i = 0; i < lineNumber + 1; i++) {
      const line = lines[i].trim();
      const indentation = getIndentation(lines[i]);
      
      // Пропускаем пустые строки
      if (line === '') continue;
      
      // Ищем JSON-ключи (например, "databaseChangeLog": или "changeSet": )
      const keyMatch = line.match(/"([^"]+)"\s*:/);
      if (keyMatch) {
        const tagName = keyMatch[1];
        
        // Очищаем все элементы иерархии с отступом >= текущему
        // (они больше не являются родительскими)
        while (
          hierarchyItems.length > 0 && 
          hierarchyItems[hierarchyItems.length - 1].indentation >= indentation
        ) {
          hierarchyItems.pop();
        }
        
        // Добавляем текущий тег в иерархию
        hierarchyItems.push({ 
          tag: tagName, 
          indentation,
          lineNumber: i
        });
        
        console.log(`Line ${i}: Found JSON key "${tagName}" with indentation ${indentation}`);
      }
    }
  } catch (error) {
    console.error('Error analyzing JSON context:', error);
  }
  
  // Получаем активные теги и их отступы
  const activeTags = [];
  const tagIndentations = {};
  
  hierarchyItems.forEach(item => {
    if (item.indentation < currentIndentation) {
      activeTags.push(item.tag);
      tagIndentations[item.tag] = {
        indentation: item.indentation,
        lineNumber: item.lineNumber
      };
    }
  });
  
  console.log('JSON Hierarchy:', hierarchyItems);
  console.log('Active tags:', activeTags);
  console.log('Tag indentations:', tagIndentations);
  console.log('Current indentation:', currentIndentation);

  return {
    activeTags,
    tagIndentations,
    isRoot: activeTags.length === 0,
    hasDatabaseChangeLog,
    currentIndentation
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