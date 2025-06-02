const vscode = require('vscode');
const path = require('path');

const ExtensionCommand = require('../ExtensionCommand');

const { extractChangesetInfoAtCursor, getAllChangesets, isYamlFile, isJsonFile } = require('./extractors/ExtractorFactory');
const { buildTempChangelog } = require('./changeloBuilder');
const { runLiquibase } = require('./liquibaseRunner');
const { promptSelectChangeset, promptSelectSqlType } = require('./promptUser');
const { extractChangesetSql } = require('./sqlProcessor');
const { createTempFile, deleteFileIfExists } = require('../common/fileOperations');
const { getLiquibasePropertiesPath } = require('../common/workspaceConfig');

class PreviewSql extends ExtensionCommand {
    constructor() {
        super();
    }

    getCommandId() {
        return 'liquibaseGenerator.generateSql';
    }

    async execute(contextual = false) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a changelog file with changesets');
            return;
        }

        const text = editor.document.getText();
        const filePath = editor.document.uri.fsPath;
        const workspaceFolder = path.dirname(filePath);
        const isYaml = isYamlFile(filePath);
        const isJson = isJsonFile(filePath);

        let changesetInfo = null;

        if (contextual) {
            try {
                const cursorPosition = editor.document.offsetAt(editor.selection.active);
                changesetInfo = await extractChangesetInfoAtCursor(text, cursorPosition, filePath);
                if (changesetInfo) {
                    const sqlType = await promptSelectSqlType(changesetInfo);
                    if (!sqlType) return;
                    await this.processChangeset(text, workspaceFolder, changesetInfo, sqlType.label === 'Full SQL', isYaml, isJson, filePath);
                    return;
                }
            } catch (err) {
                console.error('Error extracting changeset at cursor:', err);
                vscode.window.showErrorMessage('Failed to extract changeset at cursor.');
            }
        }

        const changesets = await getAllChangesets(text, filePath);
        if (changesets.length === 0) {
            vscode.window.showErrorMessage('No changesets found in the current file');
            return;
        }

        const selected = await promptSelectChangeset(changesets);
        if (!selected) return;

        changesetInfo = { id: selected.id, author: selected.author };

        const sqlType = await promptSelectSqlType(changesetInfo);
        if (!sqlType) return;

        await this.processChangeset(text, workspaceFolder, changesetInfo, sqlType.label === 'Full SQL', isYaml, isJson, filePath);
    }

    async processChangeset(content, workspaceFolder, changesetInfo, isFullSql, isYaml, isJson, filePath) {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating ${isFullSql ? 'full' : 'changeset'} SQL for changeset ${changesetInfo.id}...`,
                cancellable: false
            }, async () => {
                const { tempContent, extension } = await buildTempChangelog(content, changesetInfo, filePath, isYaml, isJson);
                const tempFilePath = createTempFile(tempContent, 'liquibase_temp', extension);

                try {
                    const liquibasePropsPath = await getLiquibasePropertiesPath();
                    if (!liquibasePropsPath) {
                        vscode.window.showErrorMessage('Cannot proceed without liquibase.properties');
                        return;
                    }

                    const rawSql = await runLiquibase(liquibasePropsPath, tempFilePath, workspaceFolder);

                    let sqlOutput = rawSql;
                    if (!isFullSql) {
                        sqlOutput = extractChangesetSql(rawSql, changesetInfo.id, changesetInfo.author);
                    }

                    const document = await vscode.workspace.openTextDocument({ content: sqlOutput, language: 'sql' });
                    await vscode.window.showTextDocument(document);

                } finally {
                    deleteFileIfExists(tempFilePath);
                }
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Error generating SQL: ${err.message}`);
        }
    }
}

module.exports = PreviewSql;
