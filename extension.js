const vscode = require('vscode');
const { createGeneralStatusBarItem } = require('./src/ui/statusBar/statusBarItem');
const { registerAllCompletionProviders } = require('./src/intellisense');
const { generateSqlForChangeset } = require('./src/sql/liquibaseRunner');
const { getLiquibasePropertiesPath } = require('./src/config/configManager');
const { 
    startSetupWizard, 
    configurePropertiesPath, 
    configureDefaultFormats,
    configureNamingPatterns,
    configureProjectStructure,
    configureAuthor,
    configureMainParentChangelog
} = require('./src/config/setupWizard');
const { generateChangelog } = require('./src/generators/changelogGenerator');

function activate(context) {
    console.log('Liquibase plugin activated.');

    const generalStatusBarItem = createGeneralStatusBarItem();
    context.subscriptions.push(generalStatusBarItem);

    // Регистрируем провайдеры автодополнения для всех форматов
    registerAllCompletionProviders(context);

    // Register commands for SQL generation
    let fullSqlDisposable = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSql', 
        () => generateSqlForChangeset(false)
    );
    
    let contextualSqlDisposable = vscode.commands.registerCommand(
        'liquibaseGenerator.generateSqlFromContext', 
        () => generateSqlForChangeset(true)
    );
    
    context.subscriptions.push(fullSqlDisposable);
    context.subscriptions.push(contextualSqlDisposable);

    // Register command to set properties path
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
    
    // Register command for full setup wizard (only for first run or manual trigger)
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.setupExtension', async () => {
            await startSetupWizard();
        })
    );
    
    // Register individual settings configuration commands
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
    
    // Register command for main parent changelog configuration
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.configureMainParentChangelog', async () => {
            const result = await configureMainParentChangelog();
            if (result !== null) {
                if (result) {
                    vscode.window.showInformationMessage(
                        `Root changelog path set to: ${result}`,
                        { modal: false, detail: '' }
                    );
                }
            }
        })
    );
    
    // Register a command to show settings menu
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.showSettings', async () => {
            const selected = await vscode.window.showQuickPick([
                { 
                    label: '$(symbol-property) Liquibase Properties Path',
                    detail: 'Set the path to liquibase.properties file',
                    command: 'liquibaseGenerator.setPropertiesPath' 
                },
                {
                    label: '$(file) Main Changelog',
                    detail: 'Set the root changelog that new changelogs will connect to',
                    command: 'liquibaseGenerator.configureMainParentChangelog'
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
    
    // Register command for creating changelog
    context.subscriptions.push(
        vscode.commands.registerCommand('liquibaseGenerator.createChangelog', async (uri) => {
            try {
                // If uri is provided, use it as the target directory
                let targetDirectory = null;
                
                if (uri && uri.fsPath) {
                    const fs = require('fs');
                    const path = require('path');
                    const stats = fs.statSync(uri.fsPath);
                    
                    if (stats.isDirectory()) {
                        targetDirectory = uri.fsPath;
                    } else {
                        // If a file is selected, use its parent directory
                        targetDirectory = path.dirname(uri.fsPath);
                    }
                }
                
                // Create the changelog
                // If root changelog is configured in settings,
                // the new changelog will be automatically connected to it
                await generateChangelog({ targetDirectory });
            } catch (error) {
                console.error('Error creating changelog:', error);
                vscode.window.showErrorMessage(`Failed to create changelog: ${error.message}`);
            }
        })
    );
    
    // Check if this is the first run and prompt setup wizard
    checkFirstRun(context);
}

/**
 * Check if this is the first run of the extension and prompt setup wizard
 * @param {vscode.ExtensionContext} context The extension context
 */
async function checkFirstRun(context) {
    const hasRun = context.globalState.get('liquibaseGenerator.hasRun');
    
    if (!hasRun) {
        // Mark as run
        await context.globalState.update('liquibaseGenerator.hasRun', true);
        
        // Show welcome message with two options
        const result = await vscode.window.showInformationMessage(
            'Welcome to Liquibase Plugin! The extension needs some initial configuration to work properly.',
            { modal: true },  // Keep this one modal since it's important
            'Configure Now', 'Later'
        );
        
        if (result === 'Configure Now') {
            // Run the full setup wizard immediately
            await startSetupWizard();
        } else {
            // Remind about configuration option for later
            const settingsInfo = await vscode.window.showInformationMessage(
                'You can configure the plugin anytime using the "Liquibase: Plugin Settings" command in the Command Palette (Ctrl+Shift+P).',
                { modal: false, detail: '' }
            );
            
            // Show information about creating changelogs
            vscode.window.showInformationMessage(
                'To create a changelog file, right-click on a folder in the Explorer and select "Liquibase: Create Changelog". If you configure a root changelog, new changelogs will be connected to it automatically.',
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