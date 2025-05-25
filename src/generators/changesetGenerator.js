const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { formatFilename, getRelativePath, openFilesInSplitView, setCursorToOptimalPosition } = require('../common/fileUtils');
const { getTemplateContent } = require('./templateManager');
const { extractVariablesFromPattern, getUpdatedChangelogContent } = require('../common/utils');

async function generateChangeset(options) {
    try {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');

        const format = config.get('defaultChangesetFormat');
        const extension = format.toLowerCase();
        const targetDirectory = options.targetDirectory;
        const author = config.get('defaultAuthor');
        const namingPattern = config.get('changesetNamingPattern');
        const dateFormat = config.get('dateFormatInFilenames');
        const dateValue = moment().format(dateFormat);

        const variables = extractVariablesFromPattern(namingPattern);
        const variableValues = {
            ext: extension,
            author,
            date: dateValue
        };

        const completedVariableValues = await promptForMissingVariables(
            variables,
            namingPattern,
            variableValues
        );

        if (!completedVariableValues) {
            return null;
        }

        const filename = formatFilename(namingPattern, completedVariableValues);
        const changesetPath = path.join(targetDirectory, filename);

        const templateData = {
            id: filename,
            author
        };

        const content = getTemplateContent(format, 'changeset', templateData);
        fs.writeFileSync(changesetPath, content);

        const connected = await handleChangelogConnection(config, changesetPath, targetDirectory);
        if (connected) return changesetPath;

        const doc = await vscode.workspace.openTextDocument(changesetPath);
        const editor = await vscode.window.showTextDocument(doc);
        if (editor) {
            setCursorToOptimalPosition(editor);
        }

        return changesetPath;
    } catch (error) {
        console.error('Error generating changeset:', error);
        vscode.window.showErrorMessage(`Failed to generate changeset: ${error.message}`);
        return null;
    }
}

async function promptForMissingVariables(variables, namingPattern, variableValues) {
    for (const variable of variables) {
        if (variableValues[variable] !== undefined) continue;

        const inputBox = vscode.window.createInputBox();
        inputBox.prompt = `Enter ${variable} for the changeset`;

        const value = await new Promise(resolve => {
            inputBox.onDidChangeValue(val => {
                inputBox.title = val
                    ? `Preview: ${formatFilename(namingPattern, { ...variableValues, [variable]: val })}`
                    : `Changeset ${variable}`;
            });

            inputBox.onDidAccept(() => {
                inputBox.hide();
                resolve(inputBox.value);
            });

            inputBox.onDidHide(() => resolve(inputBox.value));
            inputBox.show();
        });

        if (!value) return null;
        variableValues[variable] = value;
    }

    return variableValues;
}

async function handleChangelogConnection(config, changesetPath, targetDirectory) {
    const folderMappings = config.get('folderChangelogMappings') || {};
    const associatedChangelog = folderMappings[targetDirectory];

    if (associatedChangelog && fs.existsSync(associatedChangelog)) {
        const connected = await addToChangelog(associatedChangelog, changesetPath);
        if (connected) {
            await openFilesInSplitView(associatedChangelog, changesetPath);
            return true;
        }
    }

    const choice = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description: 'Connect this changeset to a changelog' },
            { label: 'No', description: 'Keep this changeset standalone' }
        ],
        { title: 'Connect to Changelog', placeHolder: 'Do you want to connect this changeset to a changelog?' }
    );

    if (choice?.label !== 'Yes') return false;

    const changelogUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        filters: { Changelogs: ['xml', 'yaml', 'yml', 'json'] },
        title: 'Select changelog to connect this changeset to'
    });

    if (!changelogUri || changelogUri.length === 0) return false;

    const changelogPath = changelogUri[0].fsPath;
    const connected = await addToChangelog(changelogPath, changesetPath);
    if (!connected) return false;

    const rememberChoice = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description: 'Connect all future changesets from this folder' },
            { label: 'No', description: 'Ask each time' }
        ],
        {
            title: 'Remember Preference',
            placeHolder: 'Connect all future changesets from this folder to this changelog?'
        }
    );

    if (rememberChoice?.label === 'Yes') {
        folderMappings[targetDirectory] = changelogPath;
        await config.update('folderChangelogMappings', folderMappings, true);
        vscode.window.showInformationMessage(`Changesets from ${targetDirectory} will now auto-connect to this changelog.`);
    }

    await openFilesInSplitView(changelogPath, changesetPath);
    return true;
}

async function addToChangelog(changelogPath, changesetPath) {
    try {
        const relativePath = getRelativePath(changelogPath, changesetPath);
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');

        if (changelogContent.includes(relativePath)) {
            vscode.window.showInformationMessage('This changeset is already included in the changelog.');
            return true;
        }

        const format = path.extname(changelogPath).substring(1).toLowerCase();
        const updatedContent = getUpdatedChangelogContent(format, changelogContent, relativePath);

        fs.writeFileSync(changelogPath, updatedContent);
        return true;

    } catch (error) {
        console.error('Error adding to changelog:', error);
        vscode.window.showErrorMessage(`Failed to connect changeset to changelog: ${error.message}`);
        return false;
    }
}

module.exports = {
    generateChangeset
}; 