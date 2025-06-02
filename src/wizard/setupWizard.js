const vscode = require('vscode');
const ExtensionCommand = require('../ExtensionCommand');

const configurePropertiesPath = require('./steps/configurePropertiesPath');
const { configureMainParentChangelog } = require('./steps/configureChangelog');
const configureDefaultFormats = require('./steps/configureDefaultFormats');
const configureNamingPatterns = require('./steps/configureNamingPatterns');
const configureAuthor = require('./steps/configureAuthor');

class SetupWizard extends ExtensionCommand {
    getCommandId() {
        return 'liquibaseGenerator.setupExtension';
    }

    async execute() {
        try {
            const welcomeResult = await vscode.window.showInformationMessage(
                'Welcome to Liquibase Plugin Setup Wizard. This will guide you through the configuration process.',
                'Start', 'Cancel'
            );
            if (welcomeResult !== 'Start') return;

            const steps = [
                { action: configurePropertiesPath, name: 'Properties Path' },
                { action: configureMainParentChangelog, name: 'Parent Changelog' },
                { action: configureDefaultFormats, name: 'Default Formats' },
                { action: configureNamingPatterns, name: 'Naming Patterns' },
                { action: configureAuthor, name: 'Author' }
            ];

            for (const step of steps) {
                const result = await step.action();
                if (result === null || result === false) {
                    vscode.window.showWarningMessage(
                        `Setup wizard was canceled during "${step.name}". You can run it again later via "Liquibase: Plugin Settings".`
                    );
                    return;
                }
            }

            vscode.window.showInformationMessage(
                'Liquibase Plugin setup completed successfully! You can modify any settings later through the "Liquibase: Plugin Settings".',
                { modal: false }
            );
        } catch (error) {
            console.error('Error during setup wizard:', error);
            vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
        }
    }
}

module.exports = SetupWizard;
