const vscode = require('vscode');

const { createGeneralStatusBarItem } = require('./src/ui/statusBar/statusBarItem');
const { commands } = require('./src/index');
const ExtensionCommand = require('./src/ExtensionCommand')
const { resolveTargetDirectory } = require('./src/common/workspaceConfig');

const { configureChangelog } = require('./src/wizard/steps/configureChangelog');
const configurePropertiesPath = require('./src/wizard/steps/configurePropertiesPath');
const configureDefaultFormats = require('./src/wizard/steps/configureDefaultFormats');
const configureNamingPatterns = require('./src/wizard/steps/configureNamingPatterns');
const configureAuthor = require('./src/wizard/steps/configureAuthor');

const IntellisenseProvider = require('./src/intellisense/IntellisenseProvider');
const provider = new IntellisenseProvider();

function activate(context) {
    console.log('Liquibase plugin activated.');

    context.subscriptions.push(createGeneralStatusBarItem());
    context.subscriptions.push(provider.register());

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
    
    for (const command of commands) {
        if (!(command instanceof ExtensionCommand)) {
            console.warn('Пропускаем объект, не являющийся ExtensionCommand:', command);
            continue;
        }

        const commandId = command.getCommandId();

        if (!commandId) {
            console.warn('Команда не имеет commandId, пропускаем:', command);
            continue;
        }

        const disposable = vscode.commands.registerCommand(commandId, async (uri) => {
        try {
            if ('options' in command && typeof command.options === 'object' && typeof uri === 'object') {
                command.options.targetDirectory = resolveTargetDirectory(uri);
            }
            await command.execute();
        } catch (error) {
            console.error(`Ошибка выполнения команды ${commandId}:`, error);
            vscode.window.showErrorMessage(`Ошибка выполнения команды ${commandId}: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
  }
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};
