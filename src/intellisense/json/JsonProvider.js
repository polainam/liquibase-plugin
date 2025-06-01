const { analyzeContext } = require('./contextAnalyzerJson');
const { getLiquibaseTags } = require('./liquibaseTagsJson');

module.exports = {
    analyzeContext,
    getSuggestions: getLiquibaseTags,

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
};
