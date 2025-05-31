const vscode = require('vscode');
const moment = require('moment');
const fsPromises = require('fs').promises;
const path = require('path');
const { formatFilename, getRelativePath } = require('./fileUtils');
const { extractVariablesFromPattern, getUpdatedChangelogContent } = require('./commonUtils');
const { getTemplateContent } = require('./templateManager');

async function promptForVariable(variable, namingPattern, currentVars) {
    return new Promise(resolve => {
        const inputBox = vscode.window.createInputBox();
        const capitalizedVar = variable.charAt(0).toUpperCase() + variable.slice(1);

        inputBox.title = `${capitalizedVar}`;
        inputBox.prompt = `Enter ${variable}`;

        inputBox.onDidChangeValue(value => {
            if (value) {
                const previewVars = { ...currentVars, [variable]: value };
                const filename = formatFilename(namingPattern, previewVars);
                inputBox.title = `${capitalizedVar} - Preview: ${filename}`;
            } else {
                inputBox.title = `${capitalizedVar}`;
            }
        });

        inputBox.onDidAccept(() => {
            inputBox.hide();
            resolve(inputBox.value);
        });

        inputBox.onDidHide(() => {
            resolve(inputBox.value);
        });

        inputBox.show();
    });
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

function generateFilename(namingPattern, variableValues) {
    return formatFilename(namingPattern, variableValues);
}

function getInitialVariables(config, format) {
    return {
        ext: format.toLowerCase(),
        author: config.get('defaultAuthor'),
        date: moment().format(config.get('dateFormatInFilenames'))
    };
}

async function writeFile(filePath, content) {
    try {
        await fsPromises.writeFile(filePath, content);
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
}

function getTemplate(configFormat, type, templateData = {}) {
    return getTemplateContent(configFormat, type, templateData);
}

async function addToChangelogFile(parentPath, childPath, options = { showInfoMessageIfExists: false }) {
    try {
        const relativePath = getRelativePath(parentPath, childPath);
        const parentContent = await fsPromises.readFile(parentPath, 'utf8');

        if (parentContent.includes(relativePath)) {
            if (options.showInfoMessageIfExists) {
                vscode.window.showInformationMessage('This file is already included in the changelog.');
            }
            return true;
        }

        const format = path.extname(parentPath).substring(1).toLowerCase();
        const updatedContent = getUpdatedChangelogContent(format, parentContent, relativePath);

        await fsPromises.writeFile(parentPath, updatedContent);
        return true;

    } catch (error) {
        console.error('Error updating changelog file:', error);
        vscode.window.showErrorMessage(`Failed to update changelog: ${error.message}`);
        return false;
    }
}

module.exports = {
    promptForVariable,
    gatherVariableValues,
    generateFilename,
    getInitialVariables,
    writeFile,
    getTemplate,
    addToChangelogFile
};
