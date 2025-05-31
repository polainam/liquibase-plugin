const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const ExtensionCommand = require('../ExtensionCommand');

const {
    gatherVariableValues,
    generateFilename,
    getInitialVariables,
    writeFile,
    getTemplate,
    addToChangelogFile
} = require('../utils/generatorUtils');

const { openFilesInSplitView, setCursorToOptimalPosition } = require('../utils/fileUtils');

class ChangesetGenerator extends ExtensionCommand {
    constructor(options) {
        super();
        this.options = options;
        this.config = vscode.workspace.getConfiguration('liquibaseGenerator');
    }

    getCommandId() {
        return 'liquibaseGenerator.createChangeset';
    }

    async execute() {
        try {
            const targetDirectory = this.options.targetDirectory;
            const format = this.config.get('defaultChangesetFormat');
            const namingPattern = this.config.get('changesetNamingPattern');
            const initialVars = getInitialVariables(this.config, format);

            const variableValues = await gatherVariableValues(namingPattern, initialVars);
            if (!variableValues) return null;

            const filename = generateFilename(namingPattern, variableValues);
            const changesetPath = path.join(targetDirectory, filename);

            const templateData = {
                id: filename,
                author: variableValues.author
            };

            const content = getTemplate(format, 'changeset', templateData);
            await writeFile(changesetPath, content);

            const connected = await this.tryToConnectToChangelog(changesetPath, targetDirectory);
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

    async tryToConnectToChangelog(changesetPath, targetDirectory) {
        const folderMappings = this.config.get('folderChangelogMappings') || {};
        const associatedChangelog = folderMappings[targetDirectory];

        if (associatedChangelog && fs.existsSync(associatedChangelog)) {
            const connected = await addToChangelogFile(associatedChangelog, changesetPath, { showInfoMessageIfExists: true });
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
            {
                title: 'Connect to Changelog',
                placeHolder: 'Do you want to connect this changeset to a changelog?'
            }
        );

        if (choice?.label !== 'Yes') return false;

        const changelogUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            filters: { Changelogs: ['xml', 'yaml', 'yml', 'json'] },
            title: 'Select changelog to connect this changeset to'
        });

        if (!changelogUri || changelogUri.length === 0) return false;

        const changelogPath = changelogUri[0].fsPath;
        const connected = await addToChangelogFile(changelogPath, changesetPath);
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
            await this.config.update('folderChangelogMappings', folderMappings, true);
            vscode.window.showInformationMessage(`Changesets from ${targetDirectory} will now auto-connect to this changelog.`);
        }

        await openFilesInSplitView(changelogPath, changesetPath);
        return true;
    }
}

module.exports = ChangesetGenerator;
