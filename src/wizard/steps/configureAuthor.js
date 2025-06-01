const vscode = require('vscode');
const { getLiquibaseConfig } = require('../../common/workspaceConfig')

async function configureAuthor() {
    const config = getLiquibaseConfig();
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
