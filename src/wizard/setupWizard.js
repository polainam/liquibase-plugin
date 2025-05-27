const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const configurePropertiesPath = require('./steps/configurePropertiesPath');
const { configureMainParentChangelog } = require('./steps/configureChangelog');
const configureDefaultFormats = require('./steps/configureDefaultFormats');
const configureNamingPatterns = require('./steps/configureNamingPatterns');
const configureAuthor = require('./steps/configureAuthor');

async function startSetupWizard() {
    try {
        const welcomeResult = await vscode.window.showInformationMessage(
            'Welcome to Liquibase Plugin Setup Wizard. This will guide you through the configuration process.',
            'Start', 'Cancel'
        );
        if (welcomeResult !== 'Start') return false;
        
        const propertiesPath = await configurePropertiesPath();
        if (!propertiesPath) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        const parentChangelog = await configureMainParentChangelog();
        if (parentChangelog === null) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        const formatSettings = await configureDefaultFormats();
        if (!formatSettings) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        const namingSettings = await configureNamingPatterns();
        if (!namingSettings) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        const author = await configureAuthor();
        if (!author) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        vscode.window.showInformationMessage(
            'Liquibase Plugin setup completed successfully! You can modify any settings later through the "Liquibase: Plugin Settings".',
            { modal: false }
        );
        return true;
    } catch (error) {
        console.error('Error during setup wizard:', error);
        vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
        return false;
    }
}

module.exports = {
    startSetupWizard
};