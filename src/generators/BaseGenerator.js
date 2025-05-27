const vscode = require('vscode');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { formatFilename, getRelativePath } = require('../utils/fileUtils');
const { extractVariablesFromPattern, getUpdatedChangelogContent } = require('../utils/commonUtils');
const { getTemplateContent } = require('./templateManager');

class BaseGenerator {
    constructor(options) {
        this.options = options;
        this.config = vscode.workspace.getConfiguration('liquibaseGenerator');
    }

    /**
     * @returns {string}
     */
    getFormatConfigKey() {
        throw new Error('Must implement getFormatConfigKey');
    }

    /**
     * @returns {string}
     */
    getNamingPatternKey() {
        throw new Error('Must implement getNamingPatternKey');
    }

    /**
     * @returns {string}
     */
    getTemplateType() {
        throw new Error('Must implement getTemplateType');
    }

    getInitialVariables() {
        const format = this.getFormat();
        return {
            ext: format.toLowerCase(),
            author: this.config.get('defaultAuthor'),
            date: moment().format(this.config.get('dateFormatInFilenames'))
        };
    }

    getFormat() {
        return this.config.get(this.getFormatConfigKey());
    }

    getNamingPattern() {
        return this.config.get(this.getNamingPatternKey());
    }

    async promptForVariable(variable, namingPattern, currentVars) {
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

    async gatherVariableValues(namingPattern, initialVars) {
        const variables = extractVariablesFromPattern(namingPattern);
        const variableValues = { ...initialVars };

        for (const variable of variables) {
            if (variableValues[variable] !== undefined) continue;

            const value = await this.promptForVariable(variable, namingPattern, variableValues);
            if (!value) return null;
            variableValues[variable] = value;
        }

        return variableValues;
    }

    generateFilename(variableValues) {
        return formatFilename(this.getNamingPattern(), variableValues);
    }

    async writeFile(filePath, content) {
        try {
            await fsPromises.writeFile(filePath, content);
        } catch (error) {
            throw new Error(`Failed to write file: ${error.message}`);
        }
    }

    getTemplateContent(templateData = {}) {
        return getTemplateContent(this.getFormat(), this.getTemplateType(), templateData);
    }

    /**
     * @returns {Promise<string|null>}
     */
    async generate() {
        throw new Error('Must implement generate() in subclass');
    }

    async addToChangelogFile(parentPath, childPath, options = { showInfoMessageIfExists: false }) {
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
}

module.exports = BaseGenerator;
