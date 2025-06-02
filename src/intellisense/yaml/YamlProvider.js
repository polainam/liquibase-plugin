const IntellisenseProvider = require('../IntellisenseProvider');
const { getIndentation } = require('../../common/textTemplates');
const tags = require('./tagsConfigYaml');
const vscode = require('vscode');

class YamlProvider extends IntellisenseProvider {
    constructor() {
        super('yaml');
    }

    analyzeContext(document, position) {
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

    getSuggestions(contextData) {
        const { activeTags, isRoot, hasDatabaseChangeLog, currentIndentation } = contextData;
            
        console.log('Active Tags:', activeTags);
        console.log('Is Root:', isRoot);
        console.log('Has DatabaseChangeLog:', hasDatabaseChangeLog);
    
        // Полная фильтрация с отладкой
        const filteredTags = tags.filter(tag => {
            // Если это databaseChangeLog и он уже есть в документе - исключаем
            if (tag.name === 'databaseChangeLog' && hasDatabaseChangeLog) {
                console.log(`${tag.name}: Отклонен - databaseChangeLog уже существует`);
                return false;
            }
    
            // Проверяем разрешённые контексты
            const isAllowed = isRoot 
                ? tag.allowedIn.includes("root")
                : tag.allowedIn.some(parentTag => activeTags.includes(parentTag));
    
            // Проверяем запрещённые контексты
            const isDisallowed = tag.disallowedIn.some(
                forbiddenTag => activeTags.includes(forbiddenTag)
            );
    
            const result = isAllowed && !isDisallowed;
            console.log(`${tag.name}: ${result ? 'Разрешен' : 'Отклонен'} - allowedIn: ${tag.allowedIn}, activeTags: ${activeTags}`);
            
            return result;
        });
    
        console.log('Filtered tags count:', filteredTags.length);
    
        return filteredTags.map(tag => {
            // Создаем объект CompletionItem с дополнительными данными
            const item = new vscode.CompletionItem({
                label: tag.name,
                description: tag.documentation,
                detail: `Liquibase ${tag.name} tag`,
            });
    
            // Устанавливаем тип элемента как сниппет
            item.kind = vscode.CompletionItemKind.Snippet;
            
            // Устанавливаем текст для вставки
            item.insertText = new vscode.SnippetString(tag.snippet);
            
            // Устанавливаем документацию
            item.documentation = new vscode.MarkdownString(tag.documentation);
    
            // Сохраняем конфигурацию тега в userData
            item.command = {
                command: 'liquibase.storeTagConfig',
                title: 'Store Tag Config',
                arguments: [tag]
            };
    
            return item;
        });
    }

    isIndentationValid(tagConfig, contextData, parentTag) {
        const { tagIndentations, currentIndentation } = contextData;
        const parentIndentation = parentTag ? tagIndentations[parentTag]?.indentation : 0;

        if (tagConfig.indentationRules.type === 'absolute') {
            return currentIndentation === tagConfig.indentationRules.spaces;
        }

        if (tagConfig.indentationRules.type === 'relative') {
            const expectedIndentation = parentIndentation + tagConfig.indentationRules.spaces;
            return currentIndentation === expectedIndentation;
        }

        return false;
    }
}

module.exports = YamlProvider;
