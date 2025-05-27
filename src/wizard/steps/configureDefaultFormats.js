const vscode = require('vscode');

async function configureDefaultFormats() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    const formatOptions = ['XML', 'YAML', 'JSON', 'SQL'];
    
    const currentChangelogFormat = config.get('defaultChangelogFormat');
    const currentChangesetFormat = config.get('defaultChangesetFormat');
    
    const changelogFormatOptions = formatOptions.map(format => ({
        label: format,
        description: format.toLowerCase() === currentChangelogFormat ? '(current)' : '',
        picked: format.toLowerCase() === currentChangelogFormat
    }));
    
    const changelogFormat = await vscode.window.showQuickPick(changelogFormatOptions, {
        placeHolder: 'Select default format for changelog files',
        title: 'Default Changelog Format'
    });
    if (!changelogFormat) return null;
    
    const changesetFormatOptions = formatOptions.map(format => ({
        label: format,
        description: format.toLowerCase() === currentChangesetFormat ? '(current)' : '',
        picked: format.toLowerCase() === currentChangesetFormat
    }));
    
    const changesetFormat = await vscode.window.showQuickPick(changesetFormatOptions, {
        placeHolder: 'Select default format for changeset files',
        title: 'Default Changeset Format'
    });
    if (!changesetFormat) return null;
    
    await config.update('defaultChangelogFormat', changelogFormat.label.toLowerCase(), true);
    await config.update('defaultChangesetFormat', changesetFormat.label.toLowerCase(), true);
    
    return {
        changelogFormat: changelogFormat.label.toLowerCase(),
        changesetFormat: changesetFormat.label.toLowerCase()
    };
}

module.exports = configureDefaultFormats;
