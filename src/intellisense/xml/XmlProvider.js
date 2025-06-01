const { analyzeContext } = require('./contextAnalyzerXml');
const { getLiquibaseTags } = require('./liquibaseTagsXml');

module.exports = {
    analyzeContext,
    getSuggestions: getLiquibaseTags,

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
};
