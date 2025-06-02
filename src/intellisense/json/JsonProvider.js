const vscode = require('vscode');
const jsonc = require('jsonc-parser');
const tags = require('./tagsConfigJson');
const { getIndentation } = require('../../common/textTemplates');
const IntellisenseProvider = require('../IntellisenseProvider');

class JsonProvider extends IntellisenseProvider {
    constructor() {
        super('json');
    }

    analyzeContext(document, position) {
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

    getSuggestions(contextData) {
        const { activeTags, isRoot, hasDatabaseChangeLog } = contextData;

        const filteredTags = tags.filter(tag => {
            if (tag.name === 'databaseChangeLog' && hasDatabaseChangeLog) return false;

            const isAllowed = isRoot
                ? tag.allowedIn.includes('root')
                : tag.allowedIn.some(parentTag => activeTags.includes(parentTag));

            const isDisallowed = tag.disallowedIn.some(
                forbiddenTag => activeTags.includes(forbiddenTag)
            );

            return isAllowed && !isDisallowed;
        });

        return filteredTags.map(tag => {
            const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(tag.snippet);
            item.documentation = new vscode.MarkdownString(tag.documentation);
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

module.exports = JsonProvider;
