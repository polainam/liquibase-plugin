const vscode = require('vscode');

async function configureAuthor() {
    const config = vscode.workspace.getConfiguration('liquibaseGenerator');
    const currentAuthor = config.get('defaultAuthor') || process.env.USER || process.env.USERNAME || '';
    
    const author = await vscode.window.showInputBox({
        title: 'Default Author',
        prompt: 'Enter default author for changelogs and changesets (e.g., your email or username)',
        value: currentAuthor,
        placeHolder: 'your.email@example.com'
    });
    if (author === undefined) return null;
    
    await config.update('defaultAuthor', author, true);
    return author;
}

module.exports = configureAuthor;
