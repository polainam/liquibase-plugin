const IntellisenseProvider = require('../IntellisenseProvider');
const vscode = require('vscode');
const { getIndentation } = require('../../common/textTemplates');
const tags = require('./tagsConfigXml');

class XmlProvider extends IntellisenseProvider {
        constructor() {
            super('xml');
        }

    analyzeContext(document, position) {
        const fullText = document.getText();
        const offset = document.offsetAt(position);
        const textBeforeCursor = fullText.substring(0, offset);
        const lines = fullText.split('\n');
        const lineNumber = position.line;
        const currentLineText = lines[lineNumber] || '';
        const currentIndentation = getIndentation(currentLineText);
        const hasDatabaseChangeLog = fullText.includes('<databaseChangeLog');

        // Удаляем комментарии
        const sanitizedText = textBeforeCursor.replace(/<!--[\s\S]*?-->/g, '');

        // Проверяем, находимся ли мы внутри открывающего/закрывающего тега
        const inTag = /<[^>]*$/.test(sanitizedText);
        if (inTag) {
            return {
            activeTags: [],
            tagIndentations: {},
            isRoot: false,
            hasDatabaseChangeLog,
            inTag: true,
            currentIndentation,
            };
        }

        // Регулярное выражение для поиска всех тегов (открывающих, закрывающих, самозакрывающихся)
        const tagRegex = /<\/?(\w+)([^>]*)\/?>/g;

        const tagStack = [];
        const tagIndentations = {};

        // Проходим по всем тегам в тексте до курсора
        let match;
        while ((match = tagRegex.exec(sanitizedText)) !== null) {
            const fullMatch = match[0];
            const tagName = match[1];
            const isClosingTag = fullMatch.startsWith('</');
            const isSelfClosing = /\/>$/.test(fullMatch) || /\/\s*>$/.test(fullMatch);

            // Вычисляем строку и отступ текущего тега по индексу совпадения
            const index = match.index;
            const beforeTag = sanitizedText.substring(0, index);
            const linesBeforeTag = beforeTag.split('\n');
            const tagLineNumber = linesBeforeTag.length - 1;
            const tagLineText = lines[tagLineNumber] || '';
            const tagIndent = getIndentation(tagLineText);

            if (isClosingTag) {
            // Убираем из стека последний открытый тег с таким именем (если есть)
            for (let i = tagStack.length - 1; i >= 0; i--) {
                if (tagStack[i] === tagName) {
                tagStack.splice(i, 1);
                break;
                }
            }
            // Не обновляем tagIndentations при закрывающем теге
            } else if (!isClosingTag) {
            // Открывающий или самозакрывающийся тег
            tagStack.push(tagName);
            tagIndentations[tagName] = { indentation: tagIndent, lineNumber: tagLineNumber };
            if (isSelfClosing) {
                // Если тег самозакрывающийся, сразу удаляем из стека (он не влияет на иерархию)
                tagStack.pop();
            }
            }
        }

        return {
            activeTags: tagStack,
            tagIndentations,
            isRoot: tagStack.length === 0,
            hasDatabaseChangeLog,
            inTag: false,
            currentIndentation,
        };
    }

    getSuggestions(contextData) {
        const { activeTags, isRoot, hasDatabaseChangeLog } = contextData;
        return tags.filter(tag => {
            // Если это databaseChangeLog и он уже есть в документе - исключаем
            if (tag.name === 'databaseChangeLog' && hasDatabaseChangeLog) {
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
    
            return isAllowed && !isDisallowed;
        }).map(tag => {
            const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(tag.snippet);
            item.documentation = new vscode.MarkdownString(tag.documentation);
            // Сохраняем конфигурацию тега в команде
            item.command = {
                command: 'liquibase.storeTagConfig',
                title: 'Store Tag Config',
                arguments: [tag]
            };
            return item;
        });
    }

    isIndentationValid(tagConfig, contextData, parentTag) {
        const { tagIndentations, currentIndentation, isRoot } = contextData;
        const parentIndentation = parentTag ? tagIndentations[parentTag]?.indentation ?? 0 : 0;

        if (tagConfig.name === 'databaseChangeLog') {
            return isRoot && currentIndentation === 0;
        }

        if (!tagConfig.indentationRules) return false;

        if (parentTag && (!tagConfig.allowedIn || !tagConfig.allowedIn.includes(parentTag))) {
            return false;
        }

        if (tagConfig.indentationRules.type === 'absolute') {
            return currentIndentation === tagConfig.indentationRules.spaces;
        }

        if (tagConfig.indentationRules.type === 'relative') {
            return currentIndentation === parentIndentation + tagConfig.indentationRules.spaces;
        }

        return false;
    }
}

module.exports = XmlProvider;
