const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const fsPromises = require('fs').promises;
const { formatFilename, getRelativePath, openFilesInSplitView } = require('../common/fileUtils');
const { getTemplateContent } = require('./templateManager');
const { extractVariablesFromPattern, getUpdatedChangelogContent } = require('../common/utils');

async function promptForVariable(variable, namingPattern, currentVars) {
    return new Promise(resolve => {
        const inputBox = vscode.window.createInputBox();
        const capitalizedVar = variable.charAt(0).toUpperCase() + variable.slice(1);

        inputBox.title = `Changelog ${capitalizedVar}`;
        inputBox.prompt = `Enter ${variable} for the changelog`;

        inputBox.onDidChangeValue(value => {
            if (value) {
                const previewVars = { ...currentVars, [variable]: value };
                const filename = formatFilename(namingPattern, previewVars);
                inputBox.title = `Changelog ${capitalizedVar} - Preview: ${filename}`;
            } else {
                inputBox.title = `Changelog ${capitalizedVar}`;
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

async function writeChangelogFile(filePath, content) {
    try {
        await fsPromises.writeFile(filePath, content);
    } catch (error) {
        throw new Error(`Failed to write changelog file: ${error.message}`);
    }
}

async function openChangelogDocuments(mainParentChangelog, changelogPath) {
    if (mainParentChangelog && fs.existsSync(mainParentChangelog)) {
        const connected = await addToParentChangelog(mainParentChangelog, changelogPath);
        if (connected) {
            await openFilesInSplitView(mainParentChangelog, changelogPath);
            return;
        }
    }
    const doc = await vscode.workspace.openTextDocument(changelogPath);
    await vscode.window.showTextDocument(doc);
}

async function maybeShowRootWarning(config) {
    const showWarning = config.get('showRootChangelogWarning');
    if (!showWarning) return;

    const selection = await vscode.window.showInformationMessage(
        'No root changelog is configured. This changelog will not be automatically connected. You can configure a root changelog in the Liquibase Plugin Settings.',
        { modal: false, detail: '' },
        'OK',
        'Don\'t show again'
    );

    if (selection === 'Don\'t show again') {
        await config.update('showRootChangelogWarning', false, true);
    }
}

async function generateChangelog(options) {
    try {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');

        const format = config.get('defaultChangelogFormat');
        const extension = format.toLowerCase();
        const targetDirectory = options.targetDirectory;
        const author = config.get('defaultAuthor');
        const namingPattern = config.get('changelogNamingPattern');
        const dateFormat = config.get('dateFormatInFilenames');
        const dateValue = moment().format(dateFormat);

        const initialVariables = {
            ext: extension,
            author,
            date: dateValue,
        };

        const variableValues = await gatherVariableValues(namingPattern, initialVariables);
        if (!variableValues) return null;

        const filename = formatFilename(namingPattern, variableValues);
        const changelogPath = path.join(targetDirectory, filename);

        const content = getTemplateContent(format, 'changelog');

        await writeChangelogFile(changelogPath, content);
        const mainParentChangelog = config.get('mainParentChangelog');

        if (!mainParentChangelog || !fs.existsSync(mainParentChangelog)) {
            await openChangelogDocuments(null, changelogPath);
            await maybeShowRootWarning(config);
            return changelogPath;
        }

        await openChangelogDocuments(mainParentChangelog, changelogPath);
        return changelogPath;

    } catch (error) {
        console.error('Error generating changelog:', error);
        vscode.window.showErrorMessage(`Failed to generate changelog: ${error.message}`);
        return null;
    }
}

async function addToParentChangelog(parentPath, changelogPath) {
    try {
        const relativePath = getRelativePath(parentPath, changelogPath);
        const parentContent = fs.readFileSync(parentPath, 'utf8');

        if (parentContent.includes(relativePath)) {
            return true;
        }

        const format = path.extname(parentPath).substring(1).toLowerCase();
        const updatedContent = getUpdatedChangelogContent(format, parentContent, relativePath);

        fs.writeFileSync(parentPath, updatedContent);
        return true;

    } catch (error) {
        console.error('Error adding to parent changelog:', error);
        return false;
    }
}

module.exports = {
    generateChangelog
}; 
