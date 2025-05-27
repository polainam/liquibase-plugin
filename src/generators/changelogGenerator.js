const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const BaseGenerator = require('./BaseGenerator');
const { openFilesInSplitView, setCursorToOptimalPosition } = require('../utils/fileUtils');

class ChangelogGenerator extends BaseGenerator {
    getFormatConfigKey() {
        return 'defaultChangelogFormat';
    }

    getNamingPatternKey() {
        return 'changelogNamingPattern';
    }

    getTemplateType() {
        return 'changelog';
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
            const connected = await this.addToChangelogFile(mainParentChangelog, changelogPath);
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

    async generate() {
        try {
            const targetDirectory = this.options.targetDirectory;
            const initialVars = this.getInitialVariables();
            const namingPattern = this.getNamingPattern();

            const variableValues = await this.gatherVariableValues(namingPattern, initialVars);
            if (!variableValues) return null;

            const filename = this.generateFilename(variableValues);
        const changelogPath = path.join(targetDirectory, filename);
        
            const content = this.getTemplateContent();
            await this.writeFile(changelogPath, content);

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
