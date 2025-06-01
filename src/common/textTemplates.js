const moment = require('moment');
const { getConfigValue } = require('./workspaceConfig');
const { promptForVariable } = require('./editorView');

function extractVariablesFromPattern(pattern) {
  const matches = pattern.match(/\{([^}]+)\}/g) || [];
  return matches.map(match => match.slice(1, -1));
}

async function gatherVariableValues(namingPattern, initialVars) {
    const variables = extractVariablesFromPattern(namingPattern);
    const variableValues = { ...initialVars };

    for (const variable of variables) {
        if (variableValues[variable] !== undefined) continue;

        const value = await promptForVariable(variable, namingPattern, variableValues);
        if (!value) return null;
        variableValues[variable] = value;
    }

    return variableValues;
}

function getInitialVariables(config, format) {
    return {
        ext: format.toLowerCase(),
        author: getConfigValue('defaultAuthor'),
        date: moment().format(getConfigValue('dateFormatInFilenames'))
    };
}

function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

module.exports = {
    extractVariablesFromPattern,
    gatherVariableValues,
    getInitialVariables,
    getIndentation
}; 