const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const ExtensionCommand = require('../ExtensionCommand');

const { addToChangelogFile } = require('./utils');
const { getTemplate } = require('./templateFactory')
const { openFilesInSplitView, setCursorToOptimalPosition } = require('../common/editorView');
const { gatherVariableValues, getInitialVariables } = require('../common/textTemplates')
const { formatFilename, writeFile } = require('../common/fileOperations')
const { getLiquibaseConfig } = require('../common/workspaceConfig')

class ChangelogGenerator extends ExtensionCommand {
    constructor(options) {
        super();
        this.options = options;
        this.config = getLiquibaseConfig();
    }

    getCommandId() {
        return 'liquibaseGenerator.createChangelog';
    }

    async maybeShowRootWarning() {
        const showWarning = this.config.get('showRootChangelogWarning');
        if (!showWarning) return;

        const selection = await vscode.window.showInformationMessage(
            'No root changelog is configured. This changelog will not be automatically connected. You can configure a root changelog in the Liquibase Plugin Settings.',
            { modal: false },
            'OK',
            "Don't show again"
        );

        if (selection === "Don't show again") {
            await this.config.update('showRootChangelogWarning', false, true);
        }
    }

    async openChangelogDocuments(mainParentChangelog, changelogPath) {
        if (mainParentChangelog && fs.existsSync(mainParentChangelog)) {
            const connected = await addToChangelogFile(mainParentChangelog, changelogPath);
            if (connected) {
                await openFilesInSplitView(mainParentChangelog, changelogPath);
                return;
            }
        }

        const doc = await vscode.workspace.openTextDocument(changelogPath);
        const editor = await vscode.window.showTextDocument(doc);
        if (editor) {
            setCursorToOptimalPosition(editor);
        }
    }

    async execute() {
        try {
            const targetDirectory = this.options.targetDirectory;
            const format = this.config.get('defaultChangelogFormat');
            const namingPattern = this.config.get('changelogNamingPattern');
            const initialVars = getInitialVariables(this.config, format);

            const variableValues = await gatherVariableValues(namingPattern, initialVars);
            if (!variableValues) return null;

            const filename = formatFilename(namingPattern, variableValues);
            const changelogPath = path.join(targetDirectory, filename);

            const content = getTemplate(format, 'changelog');
            await writeFile(changelogPath, content);

            const mainParentChangelog = this.config.get('mainParentChangelog');
            if (!mainParentChangelog || !fs.existsSync(mainParentChangelog)) {
                await this.openChangelogDocuments(null, changelogPath);
                await this.maybeShowRootWarning();
                return changelogPath;
            }

            await this.openChangelogDocuments(mainParentChangelog, changelogPath);
            return changelogPath;

        } catch (error) {
            console.error('Error generating changelog:', error);
            vscode.window.showErrorMessage(`Failed to generate changelog: ${error.message}`);
            return null;
        }
    }
}

module.exports = ChangelogGenerator;
