// Setup Wizard for Liquibase Extension

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Starts the setup wizard process
 * @returns {Promise<boolean>} True if setup was completed successfully
 */
async function startSetupWizard() {
    try {
        // Show welcome message
        const welcomeResult = await vscode.window.showInformationMessage(
            'Welcome to Liquibase Plugin Setup Wizard. This will guide you through the configuration process.',
            'Start', 'Cancel'
        );
        
        if (welcomeResult !== 'Start') {
            return false;
        }
        
        // Step 1: Configure liquibase.properties file
        const propertiesPath = await configurePropertiesPath();
        if (!propertiesPath) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        // Step 2 & 3: Configure default formats (for changelog and changeset)
        const formatSettings = await configureDefaultFormats();
        if (!formatSettings) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        // Step 4-7: Configure naming patterns (date format + patterns for changelog and changeset)
        const namingSettings = await configureNamingPatterns();
        if (!namingSettings) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        // Step 5: Configure author
        const author = await configureAuthor();
        if (!author) {
            vscode.window.showWarningMessage('Setup wizard was canceled. You can run it again later with "Liquibase: Plugin Settings".');
            return false;
        }
        
        // Setup completed
        vscode.window.showInformationMessage(
            'Liquibase Plugin setup completed successfully! You can modify any settings later through the "Liquibase: Plugin Settings".',
            'OK'
        );
        
        return true;
    } catch (error) {
        console.error('Error during setup wizard:', error);
        vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
        return false;
    }
}

/**
 * Configure the liquibase.properties file path
 * @returns {Promise<string|null>} Path to the properties file or null
 */
async function configurePropertiesPath() {
    // Try to get the path from settings
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    let propertiesPath = config.get('propertiesPath');
    
    // If already set and file exists, ask if user wants to change it
    if (propertiesPath && fs.existsSync(propertiesPath)) {
        const result = await vscode.window.showInformationMessage(
            `Found existing liquibase.properties at: ${propertiesPath}. Would you like to use a different file?`,
            'Yes, change file', 'No, keep current file'
        );
        
        if (result !== 'Yes, change file') {
            return propertiesPath;
        }
    }
    
    // Open a file dialog to select the properties file
    const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'Properties Files': ['properties']
        },
        title: 'Select liquibase.properties file'
    });
    
    if (!fileUris || fileUris.length === 0) {
        return null;
    }
    
    propertiesPath = fileUris[0].fsPath;
    
    // Save the path to settings
    await config.update('propertiesPath', propertiesPath, true);
    return propertiesPath;
}

/**
 * Configure default formats for changelog and changeset files
 * @returns {Promise<Object|null>} Selected format settings or null if canceled
 */
async function configureDefaultFormats() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    
    // Format options
    const formatOptions = ['XML', 'YAML', 'JSON', 'SQL'];
    
    // Get current values from config if they exist
    const currentChangelogFormat = config.get('defaultChangelogFormat') || 'xml';
    const currentChangesetFormat = config.get('defaultChangesetFormat') || 'xml';
    
    // Create formatted options with current selection marked
    const changelogFormatOptions = formatOptions.map(format => ({
        label: format,
        description: format.toLowerCase() === currentChangelogFormat ? '(current)' : '',
        picked: format.toLowerCase() === currentChangelogFormat
    }));
    
    // Select default changelog format
    const changelogFormat = await vscode.window.showQuickPick(changelogFormatOptions, {
        placeHolder: 'Select default format for changelog files',
        title: 'Default Changelog Format'
    });
    
    if (!changelogFormat) return null;
    
    // Create formatted options with current selection marked
    const changesetFormatOptions = formatOptions.map(format => ({
        label: format,
        description: format.toLowerCase() === currentChangesetFormat ? '(current)' : '',
        picked: format.toLowerCase() === currentChangesetFormat
    }));
    
    // Select default changeset format
    const changesetFormat = await vscode.window.showQuickPick(changesetFormatOptions, {
        placeHolder: 'Select default format for changeset files',
        title: 'Default Changeset Format'
    });
    
    if (!changesetFormat) return null;
    
    // Save settings
    await config.update('defaultChangelogFormat', changelogFormat.label.toLowerCase(), true);
    await config.update('defaultChangesetFormat', changesetFormat.label.toLowerCase(), true);
    
    return {
        changelogFormat: changelogFormat.label.toLowerCase(),
        changesetFormat: changesetFormat.label.toLowerCase()
    };
}

/**
 * Configure naming patterns for changelog and changeset files
 * @returns {Promise<Object|null>} Selected naming patterns or null if canceled
 */
async function configureNamingPatterns() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    
    // Get date format
    const currentDateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
    
    // Input for date format
    const dateFormat = await vscode.window.showInputBox({
        title: 'Date Format in Filenames',
        prompt: 'Enter date format for filenames (using moment.js format)',
        value: currentDateFormat,
        placeHolder: 'YYYYMMDD'
    });
    
    if (dateFormat === undefined) return null;
    
    // Save date format setting
    await config.update('dateFormatInFilenames', dateFormat, true);
    
    // Select approach for naming patterns with enhanced description that includes all information
    const approachOptions = [
        { 
            label: 'Object-oriented', 
            detail: 'Focus on database objects. Recommended pattern: changelog-{object}.{ext}',
            picked: true
        },
        { 
            label: 'Release-oriented', 
            detail: 'Focus on releases and versions. Recommended pattern: changelog-{release}.{ext}',
        },
        { 
            label: 'Custom', 
            detail: 'Create your own pattern using variables: {date}, {name}, {author}, {ext}, {object}, {release}',
        }
    ];
    
    const selectedApproach = await vscode.window.showQuickPick(approachOptions, {
        placeHolder: 'Select approach for naming patterns',
        title: 'Naming Patterns Approach'
    });
    
    if (!selectedApproach) return null;
    
    // Default patterns based on chosen approach
    let changelogPattern = 'changelog-{name}.{ext}';
    let changesetPattern = 'changeset-{date}-{name}.{ext}';
    
    // Set patterns based on approach
    if (selectedApproach.label === 'Object-oriented') {
        changelogPattern = 'changelog-{object}.{ext}';
    } 
    else if (selectedApproach.label === 'Release-oriented') {
        changelogPattern = 'changelog-{release}.{ext}';
    }
    
    // Get current values from config if they exist
    const currentChangelogPattern = config.get('changelogNamingPattern') || changelogPattern;
    const currentChangesetPattern = config.get('changesetNamingPattern') || changesetPattern;
    
    // Input for changelog pattern with variables information
    const finalChangelogPattern = await vscode.window.showInputBox({
        title: 'Changelog Naming Pattern',
        prompt: 'Enter pattern for changelog filenames. Available variables: {date}, {name}, {author}, {ext}, {object}, {release}',
        value: selectedApproach.label === 'Custom' ? currentChangelogPattern : changelogPattern,
        placeHolder: changelogPattern
    });
    
    if (finalChangelogPattern === undefined) return null;
    
    // Input for changeset pattern with variables information
    const finalChangesetPattern = await vscode.window.showInputBox({
        title: 'Changeset Naming Pattern',
        prompt: 'Enter pattern for changeset filenames. Available variables: {date}, {name}, {author}, {ext}, {object}, {release}',
        value: selectedApproach.label === 'Custom' ? currentChangesetPattern : changesetPattern,
        placeHolder: changesetPattern
    });
    
    if (finalChangesetPattern === undefined) return null;
    
    // Save settings
    await config.update('changelogNamingPattern', finalChangelogPattern, true);
    await config.update('changesetNamingPattern', finalChangesetPattern, true);
    await config.update('projectStructureApproach', selectedApproach.label, true);
    
    return {
        dateFormat: dateFormat,
        changelogPattern: finalChangelogPattern,
        changesetPattern: finalChangesetPattern,
        approach: selectedApproach.label
    };
}

/**
 * Configure project structure approach
 * @returns {Promise<Object|null>} Selected structure settings or null if canceled
 */
async function configureProjectStructure() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    
    // Get current approach
    const currentApproach = config.get('projectStructureApproach') || 'Object-oriented';
    
    // Structure options
    const structureOptions = [
        { 
            label: 'Object-oriented', 
            detail: 'Organize files by object types (tables, indexes, etc.)',
            picked: currentApproach === 'Object-oriented'
        },
        { 
            label: 'Release-oriented', 
            detail: 'Organize files by release versions',
            picked: currentApproach === 'Release-oriented'
        },
        { 
            label: 'Custom', 
            detail: 'Custom directory structure',
            picked: currentApproach === 'Custom'
        }
    ];
    
    // Select project structure approach
    const structureApproach = await vscode.window.showQuickPick(structureOptions, {
        placeHolder: 'Select project structure approach',
        title: 'Project Structure'
    });
    
    if (!structureApproach) return null;
    
    // For object-oriented approach, configure object directories
    let objectDirectories = {};
    if (structureApproach.label === 'Object-oriented') {
        const defaultTypes = ['tables', 'indexes', 'views', 'procedures', 'functions'];
        
        // Get current object directories if they exist
        const currentObjectDirs = config.get('objectDirectories') || {};
        
        await vscode.window.showInformationMessage(
            'Please configure directories for different object types',
            'OK'
        );
        
        for (const type of defaultTypes) {
            const dirPath = await vscode.window.showInputBox({
                title: `Directory for ${type}`,
                prompt: `Enter directory for ${type} (relative to changeset root)`,
                value: currentObjectDirs[type] || type,
                placeHolder: type
            });
            
            if (dirPath === undefined) return null;
            objectDirectories[type] = dirPath || type;
        }
    }
    
    // Save settings
    await config.update('projectStructureApproach', structureApproach.label, true);
    
    if (structureApproach.label === 'Object-oriented') {
        await config.update('objectDirectories', objectDirectories, true);
    }
    
    return {
        structureApproach: structureApproach.label,
        objectDirectories: structureApproach.label === 'Object-oriented' ? objectDirectories : null
    };
}

/**
 * Configure author information for changelogs and changesets
 * @returns {Promise<string|null>} Selected author or null if canceled
 */
async function configureAuthor() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    
    // Get current author if exists
    const currentAuthor = config.get('defaultAuthor') || process.env.USER || process.env.USERNAME || '';
    
    // Input for author
    const author = await vscode.window.showInputBox({
        title: 'Default Author',
        prompt: 'Enter default author for changelogs and changesets (e.g., your email or username)',
        value: currentAuthor,
        placeHolder: 'your.email@example.com'
    });
    
    if (author === undefined) return null;
    
    // Save author to settings
    await config.update('defaultAuthor', author, true);
    
    return author;
}

module.exports = {
    startSetupWizard,
    configurePropertiesPath,
    configureDefaultFormats,
    configureNamingPatterns,
    configureProjectStructure,
    configureAuthor
}; 