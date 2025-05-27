const vscode = require('vscode');
const path = require('path');

async function configureMainParentChangelog() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    const currentParentChangelog = config.get('mainParentChangelog') || '';
    
    const setupParent = await vscode.window.showQuickPick([
        { label: 'Yes', description: 'Select a main parent changelog file', picked: currentParentChangelog !== '' },
        { label: 'No', description: 'Skip this step', picked: currentParentChangelog === '' }
    ], {
        placeHolder: 'Do you want to set up a main parent changelog?',
        title: 'Main Parent Changelog Configuration'
    });
    
    if (!setupParent) return null;
    
    if (setupParent.label === 'No') {
        vscode.window.showInformationMessage(
            'No main parent changelog configured. You can create one later, but new changelogs will not be automatically connected.',
            { modal: false }
        );
        if (currentParentChangelog) {
            await config.update('mainParentChangelog', '', true);
        }
        await config.update('showRootChangelogWarning', true, true);
        return '';
    }
    
    const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Changelog Files': ['xml', 'yaml', 'yml', 'json', 'sql'] },
        title: 'Select Main Parent Changelog File'
    });
    if (!fileUris || fileUris.length === 0) {
        vscode.window.showInformationMessage(
            'No main parent changelog selected. New changelogs will not be automatically connected.',
            { modal: false }
        );
        return '';
    }
    
    const parentChangelog = fileUris[0].fsPath;
    await config.update('mainParentChangelog', parentChangelog, true);
    await config.update('showRootChangelogWarning', false, true);
    
    return parentChangelog;
}

async function configureFolderChangelog() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    
    const folderUris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        title: 'Select Folder for Changelog Configuration'
    });
    if (!folderUris || folderUris.length === 0) return null;
    const folderPath = folderUris[0].fsPath;
    
    const changelogUris = await vscode.window.showOpenDialog({
        canSelectFolders: false,
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'Changelog Files': ['xml', 'yaml', 'yml', 'json', 'sql'] },
        title: 'Select Changelog File for This Folder'
    });
    if (!changelogUris || changelogUris.length === 0) return null;
    const changelogPath = changelogUris[0].fsPath;
    
    const folderMappings = config.get('folderChangelogMappings') || {};
    folderMappings[folderPath] = changelogPath;
    await config.update('folderChangelogMappings', folderMappings, true);
    
    return {
        folderPath,
        changelogPath,
        message: `Folder changelog configured: changesets in "${path.basename(folderPath)}" will be connected to ${path.basename(changelogPath)}`
    };
}

async function configureChangelog() {
    const choice = await vscode.window.showQuickPick([
        { label: 'Root Changelog', detail: 'Configure main changelog for the entire project' },
        { label: 'Folder Changelog', detail: 'Configure changelog for a specific folder' }
    ], {
        placeHolder: 'Select type of changelog to configure',
        title: 'Changelog Configuration'
    });
    if (!choice) return null;
    
    if (choice.label === 'Root Changelog') {
        return await configureMainParentChangelog();
    } else if (choice.label === 'Folder Changelog') {
        return await configureFolderChangelog();
    }
    return null;
}

module.exports = {
    configureChangelog,
    configureMainParentChangelog,
    configureFolderChangelog
};
