const vscode = require('vscode');

class IntellisenseProvider {
    constructor(languageId) {
        this.languageId = languageId;
        this.selector = [{ language: languageId, scheme: 'file' }];
    }

    analyzeContext(document, position) {
        throw new Error('analyzeContext must be implemented by subclass');
    }

    getSuggestions(contextData) {
        throw new Error('getSuggestions must be implemented by subclass');
    }

    isIndentationValid(tagConfig, contextData, parentTag) {
        throw new Error('isIndentationValid must be implemented by subclass');
    }

    register() {
        return vscode.languages.registerCompletionItemProvider(
            this.selector,
            {
                provideCompletionItems: (document, position) => {
                    const contextData = this.analyzeContext(document, position);
                    const allSuggestions = this.getSuggestions(contextData);

                    const parentTag = contextData.activeTags?.[contextData.activeTags.length - 1] || null;

                    return allSuggestions.filter(suggestion => {
                        const tagConfig = suggestion.command?.arguments?.[0];
                        return tagConfig && this.isIndentationValid(tagConfig, contextData, parentTag);
                    });
                }
            }
        );
    }
}

module.exports = IntellisenseProvider;
