const vscode = require('vscode');

function analyzeContext(document, position) {
  const fullText = document.getText();
  const lineNumber = position.line;
  const lines = fullText.split(/\r?\n/);
  
  // Отладочная информация
  console.log('Analyzing YAML at line:', lineNumber);
  
  // Проверка наличия databaseChangeLog в документе
  const hasDatabaseChangeLog = fullText.includes('databaseChangeLog:');

  // Если документ пуст, возвращаем базовый контекст
  if (fullText.trim() === '') {
    return {
      activeTags: [],
      tagIndentations: {},  // Новое поле для хранения отступов тегов
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
  
  // Анализируем все строки до текущей позиции
  for (let i = 0; i < lineNumber + 1; i++) {
    const line = lines[i].trim();
    const indentation = getIndentation(lines[i]);
    
    // Пропускаем пустые строки и комментарии
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    
    // Если нашли YAML-ключ
    if (line.includes(':')) {
      let tagName = null;
      let isList = false;
      
      // Если элемент списка (например, "- changeSet:")
      if (line.startsWith('-')) {
        const match = line.match(/^-\s*([^:]+):/);
        if (match) {
          tagName = match[1].trim();
          isList = true;
        }
      } 
      // Обычный YAML-ключ (не список)
      else {
        const match = line.match(/^([^:]+):/);
        if (match) {
          tagName = match[1].trim();
        }
      }
      
      if (tagName) {
        // Очищаем все элементы иерархии с отступом >= текущему
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
          lineNumber: i,
          isList
        });
        
        console.log(`Line ${i}: Found tag "${tagName}" with indentation ${indentation}, isList: ${isList}`);
      }
    }
  }
  
  // Получаем активные теги и их отступы
  const activeTags = [];
  const tagIndentations = {};
  
  hierarchyItems.forEach((item, index) => {
    if (item.indentation < currentIndentation) {
      activeTags.push(item.tag);
      tagIndentations[item.tag] = {
        indentation: item.indentation,
        lineNumber: item.lineNumber,
        isList: item.isList
      };
    }
  });
  
  console.log('Hierarchy:', hierarchyItems);
  console.log('Active tags:', activeTags);
  console.log('Tag indentations:', tagIndentations);
  console.log('Current indentation:', currentIndentation);

  return {
    activeTags,
    tagIndentations,  // Добавляем информацию об отступах в возвращаемый объект
    isRoot: activeTags.length === 0,
    hasDatabaseChangeLog,
    currentIndentation
  };
}

// Вспомогательная функция для определения уровня отступа
function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

// Проверяет, является ли строка элементом списка (начинается с "- ")
function isListItem(line) {
  return line.trim().startsWith('-');
}

module.exports = {
  analyzeContext
}; 