const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { createGeneralStatusBarItem } = require('./src/ui/statusBar/statusBarItem');
const { configureChangelog } = require('./src/wizard/steps/configureChangelog');

const configurePropertiesPath = require('./src/wizard/steps/configurePropertiesPath');
const configureDefaultFormats = require('./src/wizard/steps/configureDefaultFormats');
const configureNamingPatterns = require('./src/wizard/steps/configureNamingPatterns');
const configureAuthor = require('./src/wizard/steps/configureAuthor');

const PreviewSql = require('./src/sql/PreviewSql');
const previewSql = new PreviewSql();

const ChangelogGenerator = require('./src/generators/changelogGenerator');
const ChangesetGenerator = require('./src/generators/changesetGenerator');

const SetupWizard = require('./src/wizard/setupWizard');
const setupWizard = new SetupWizard();

const IntellisenseProvider = require('./src/intellisense/IntellisenseProvider');
const provider = new IntellisenseProvider();

function resolveTargetDirectory(uri) {
    if (uri && uri.fsPath) {
        const stats = fs.statSync(uri.fsPath);
        return stats.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
    }
    return null;
}

async function checkFirstRun(context) {
    const hasRun = context.globalState.get('liquibaseGenerator.hasRun');
    if (!hasRun) {
        await context.globalState.update('liquibaseGenerator.hasRun', true);

        const result = await vscode.window.showInformationMessage(
            'Welcome to Liquibase Plugin! The extension needs some initial configuration to work properly.',
            { modal: true },
            'Configure Now', 'Later'
        );

        if (result === 'Configure Now') {
            await setupWizard.execute();
        } else {
            await vscode.window.showInformationMessage(
                'You can configure the plugin anytime using the "Liquibase: Plugin Settings" command in the Command Palette (Ctrl+Shift+P).'
            );
        }
    }
}

function activate(context) {
    console.log('Liquibase plugin activated.');

    context.subscriptions.push(createGeneralStatusBarItem());
    context.subscriptions.push(provider.execute());

    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.generateSql', () => previewSql.execute(false)),
        vscode.commands.registerCommand('liquibaseGenerator.generateSqlFromContext', () => previewSql.execute(true)),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(setupWizard.getCommandId(), () => setupWizard.execute())
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.setPropertiesPath', async () => {
            const propertiesPath = await configurePropertiesPath();
            if (propertiesPath) {
                vscode.window.showInformationMessage(`Liquibase properties path set to: ${propertiesPath}`);
            }
        }),

        vscode.commands.registerCommand('liquibaseGenerator.configureFormats', async () => {
            if (await configureDefaultFormats()) {
                vscode.window.showInformationMessage('File formats configuration updated successfully');
            }
        }),

        vscode.commands.registerCommand('liquibaseGenerator.configureNaming', async () => {
            if (await configureNamingPatterns()) {
                vscode.window.showInformationMessage('Naming patterns configuration updated successfully');
            }
        }),

        vscode.commands.registerCommand('liquibaseGenerator.configureAuthor', async () => {
            if (await configureAuthor()) {
                vscode.window.showInformationMessage('Author configuration updated successfully');
            }
        }),

        vscode.commands.registerCommand('liquibaseGenerator.configureChangelog', async () => {
            const result = await configureChangelog();
            if (typeof result === 'object' && result !== null && 'message' in result) {
                vscode.window.showInformationMessage(result.message);
            }
        }),

        vscode.commands.registerCommand('liquibaseGenerator.showSettings', async () => {
            const selected = await vscode.window.showQuickPick([
                {
                    label: '$(symbol-property) Liquibase Properties Path',
                    detail: 'Set the path to liquibase.properties file',
                    command: 'liquibaseGenerator.setPropertiesPath'
                },
                {
                    label: '$(file) Configure Changelog',
                    detail: 'Configure root changelog or folder-specific changelogs',
                    command: 'liquibaseGenerator.configureChangelog'
                },
                {
                    label: '$(regex) Default Formats',
                    detail: 'Set default formats for changelog and changeset files (XML, YAML, JSON, SQL)',
                    command: 'liquibaseGenerator.configureFormats'
                },
                {
                    label: '$(symbol-text) Naming Patterns',
                    detail: 'Set patterns for changelog and changeset filenames',
                    command: 'liquibaseGenerator.configureNaming'
                },
                {
                    label: '$(person) Default Author',
                    detail: 'Set default author for changelogs and changesets',
                    command: 'liquibaseGenerator.configureAuthor'
                },
                {
                    label: '$(settings-gear) Setup Wizard',
                    detail: 'Configure all settings in sequence',
                    command: 'liquibaseGenerator.setupExtension'
                }
            ], {
                placeHolder: 'Select a setting to configure',
                title: 'Liquibase Plugin Settings'
            });

            if (selected) {
                await vscode.commands.executeCommand(selected.command);
            }
        })
    );

    const generators = [new ChangelogGenerator({}), new ChangesetGenerator({})];

    for (const generator of generators) {
        const commandId = generator.getCommandId();
        const disposable = vscode.commands.registerCommand(commandId, async (uri) => {
            try {
                const targetDirectory = resolveTargetDirectory(uri);
                generator.options.targetDirectory = targetDirectory;
                await generator.execute();
            } catch (error) {
                console.error(`Error executing ${commandId}:`, error);
                vscode.window.showErrorMessage(`Failed to execute ${commandId}: ${error.message}`);
            }
        });
        context.subscriptions.push(disposable);
    }

    checkFirstRun(context);
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};
