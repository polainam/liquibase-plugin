const vscode = require('vscode');
const { analyzeContext } = require('./contextAnalyzerXml');
const { getLiquibaseTags } = require('./liquibaseTagsXml');

function isIndentationValid(tagConfig, contextData, parentTag) {
    const { tagIndentations, currentIndentation, isRoot } = contextData;
    const parentIndentation = parentTag ? tagIndentations[parentTag]?.indentation ?? 0 : 0;

    if (tagConfig.name === 'databaseChangeLog') {
        return isRoot && currentIndentation === 0;
    }

    if (!tagConfig.indentationRules) {
        return false;
    }

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

function registerCompletionProviderXml(context) {
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: 'xml', scheme: 'file' },
        {
            provideCompletionItems(document, position) {
                const contextData = analyzeContext(document, position);
                console.log('XML Context:', JSON.stringify(contextData));

                const allSuggestions = getLiquibaseTags(contextData);
                console.log('All suggestions count:', allSuggestions.length);

                if (contextData.inTag) {
                    console.log('Inside tag, returning all suggestions');
                    return allSuggestions;
                }

                const parentTag = contextData.activeTags.length > 0
                    ? contextData.activeTags[contextData.activeTags.length - 1]
                    : (contextData.hasDatabaseChangeLog ? 'databaseChangeLog' : null);

                const filteredSuggestions = allSuggestions.filter(suggestion => {
                    const tagConfig = suggestion.command?.arguments?.[0];
                    if (!tagConfig) return false;

                    const valid = isIndentationValid(tagConfig, contextData, parentTag);

                    if (!valid) {
                        console.log(`Suggestion ${tagConfig.name} rejected by indentation rules.`);
                    }

                    return valid;
                });

                console.log('Filtered suggestions count:', filteredSuggestions.length);

                return filteredSuggestions.length > 0 ? filteredSuggestions : [];
            }
        }
    );

    context.subscriptions.push(provider);
}

module.exports = {
    registerCompletionProviderXml,
};
