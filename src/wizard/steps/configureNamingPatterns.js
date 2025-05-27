const vscode = require('vscode');

async function configureNamingPatterns() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    const currentDateFormat = config.get('dateFormatInFilenames');
    
    const dateFormat = await vscode.window.showInputBox({
        title: 'Date Format in Filenames',
        prompt: 'Enter date format for filenames (using moment.js format)',
        value: currentDateFormat,
        placeHolder: 'YYYYMMDD'
    });
    if (dateFormat === undefined) return null;
    await config.update('dateFormatInFilenames', dateFormat, true);
    
    const approachOptions = [
        { label: 'Object-oriented', detail: 'Focus on database objects. Pattern: changelog-{object}.{ext}', picked: true },
        { label: 'Release-oriented', detail: 'Focus on releases and versions. Pattern: changelog-{release}.{ext}' },
        { label: 'Custom', detail: 'Custom pattern with variables {date}, {name}, {author}, {ext}, {object}, {release}' }
    ];
    
    const selectedApproach = await vscode.window.showQuickPick(approachOptions, {
        placeHolder: 'Select approach for naming patterns',
        title: 'Naming Patterns Approach'
    });
    if (!selectedApproach) return null;
    
    let changelogPattern = 'changelog-{name}.{ext}';
    let changesetPattern = 'changeset-{date}-{name}.{ext}';
    
    if (selectedApproach.label === 'Object-oriented') {
        changelogPattern = 'changelog-{object}.{ext}';
    } else if (selectedApproach.label === 'Release-oriented') {
        changelogPattern = 'changelog-{release}.{ext}';
    }
    
    const currentChangelogPattern = config.get('changelogNamingPattern') || changelogPattern;
    const currentChangesetPattern = config.get('changesetNamingPattern') || changesetPattern;
    
    const finalChangelogPattern = await vscode.window.showInputBox({
        title: 'Changelog Naming Pattern',
        prompt: 'Enter pattern for changelog filenames. Variables: {date}, {name}, {author}, {ext}, {object}, {release}',
        value: selectedApproach.label === 'Custom' ? currentChangelogPattern : changelogPattern,
        placeHolder: changelogPattern
    });
    if (finalChangelogPattern === undefined) return null;
    
    const finalChangesetPattern = await vscode.window.showInputBox({
        title: 'Changeset Naming Pattern',
        prompt: 'Enter pattern for changeset filenames. Variables: {date}, {name}, {author}, {ext}, {object}, {release}',
        value: selectedApproach.label === 'Custom' ? currentChangesetPattern : changesetPattern,
        placeHolder: changesetPattern
    });
    if (finalChangesetPattern === undefined) return null;
    
    await config.update('changelogNamingPattern', finalChangelogPattern, true);
    await config.update('changesetNamingPattern', finalChangesetPattern, true);
    await config.update('projectStructureApproach', selectedApproach.label, true);
    
    return {
        dateFormat,
        changelogPattern: finalChangelogPattern,
        changesetPattern: finalChangesetPattern,
        approach: selectedApproach.label
    };
}

module.exports = configureNamingPatterns;
