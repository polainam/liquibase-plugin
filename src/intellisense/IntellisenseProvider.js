const vscode = require('vscode');
const ExtensionCommand = require('../ExtensionCommand');

const yaml = require('./yaml/YamlProvider');
const xml = require('./xml/XmlProvider');
const json = require('./json/JsonProvider');

const languageProviders = {
    yaml,
    xml,
    json
};

class IntellisenseProvider extends ExtensionCommand {
    constructor() {
        super();
        this.selector = Object.keys(languageProviders).map(lang => ({ language: lang, scheme: 'file' }));
    }

    getCommandId() {
        return 'liquibase.intellisense.register';
    }

    execute() {
        const provider = vscode.languages.registerCompletionItemProvider(
            this.selector,
            {
                provideCompletionItems: (document, position) => {
                    const languageId = document.languageId;

                    const provider = languageProviders[languageId];
                    if (!provider) return [];

                    const contextData = provider.analyzeContext(document, position);
                    const allSuggestions = provider.getSuggestions(contextData);

                    const parentTag = contextData.activeTags?.[contextData.activeTags.length - 1] || null;

                    return allSuggestions.filter(suggestion => {
                        const tagConfig = suggestion.command?.arguments?.[0];
                        return tagConfig && provider.isIndentationValid(tagConfig, contextData, parentTag);
                    });
                }
            }
        );

        return provider;
    }
}

module.exports = IntellisenseProvider;
