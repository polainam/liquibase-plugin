const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/ui/statusBar/statusBarItem');
const { registerAllCompletionProviders } = require('./src/intellisense');
const { generateSqlForChangeset } = require('./src/sql/liquibaseRunner');
const { 
    startSetupWizard, 
    configurePropertiesPath, 
    configureDefaultFormats,
    configureNamingPatterns,
    configureProjectStructure,
    configureAuthor,
    configureChangelog
} = require('./src/config/setupWizard');
const { generateChangelog } = require('./src/generators/changelogGenerator');
const { generateChangeset } = require('./src/generators/changesetGenerator');

function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    registerAllCompletionProviders(context);

    let fullSql = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSql', 
        () => generateSqlForChangeset(false)
    );
    
    let partialSql = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSqlFromContext', 
        () => generateSqlForChangeset(true)
    );
    
    context.subscriptions.push(fullSql);
    context.subscriptions.push(partialSql);

    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.setPropertiesPath', async () => {
            const propertiesPath = await configurePropertiesPath();
            if (propertiesPath) {
                vscode.window.showInformationMessage(
                    `Liquibase properties path set to: ${propertiesPath}`,
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.setupExtension', async () => {
            await startSetupWizard();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureFormats', async () => {
            const result = await configureDefaultFormats();
            if (result) {
                vscode.window.showInformationMessage(
                    'File formats configuration updated successfully',
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureNaming', async () => {
            const result = await configureNamingPatterns();
            if (result) {
                vscode.window.showInformationMessage(
                    'Naming patterns configuration updated successfully',
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureStructure', async () => {
            const result = await configureProjectStructure();
            if (result) {
                vscode.window.showInformationMessage(
                    'Project structure configuration updated successfully',
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureAuthor', async () => {
            const result = await configureAuthor();
            if (result) {
                vscode.window.showInformationMessage(
                    'Author configuration updated successfully',
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureChangelog', async () => {
            const result = await configureChangelog();
            if (result && result.message) {
                vscode.window.showInformationMessage(
                    result.message,
                    { modal: false, detail: '' }
                );
            }
        })
    );
    
    context.subscriptions.push(
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
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.createChangelog', async (uri) => {
            try {
                let targetDirectory = null;
                
                if (uri && uri.fsPath) {
                    const fs = require('fs');
                    const path = require('path');
                    const stats = fs.statSync(uri.fsPath);
                    
                    if (stats.isDirectory()) {
                        targetDirectory = uri.fsPath;
                    } else {
                        targetDirectory = path.dirname(uri.fsPath);
                    }
                }
                
                await generateChangelog({ targetDirectory });
            } catch (error) {
                console.error('Error creating changelog:', error);
                vscode.window.showErrorMessage(`Failed to create changelog: ${error.message}`);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.createChangeset', async (uri) => {
            try {
                let targetDirectory = null;
                
                if (uri && uri.fsPath) {
                    const fs = require('fs');
                    const path = require('path');
                    const stats = fs.statSync(uri.fsPath);
                    
                    if (stats.isDirectory()) {
                        targetDirectory = uri.fsPath;
                    } else {
                        targetDirectory = path.dirname(uri.fsPath);
                    }
                }
                
                await generateChangeset({ targetDirectory });
            } catch (error) {
                console.error('Error creating changeset:', error);
                vscode.window.showErrorMessage(`Failed to create changeset: ${error.message}`);
            }
        })
    );
    
    checkFirstRun(context);
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
            await startSetupWizard();
        } else {
            const settingsInfo = await vscode.window.showInformationMessage(
                'You can configure the plugin anytime using the "Liquibase: Plugin Settings" command in the Command Palette (Ctrl+Shift+P).',
                { modal: false, detail: '' }
            );
        }
    }
}

function deactivate() {
    console.log('Liquibase plugin deactivated.');
}

module.exports = {
    activate,
    deactivate
};