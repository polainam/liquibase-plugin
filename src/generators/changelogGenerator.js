// Generator for changelog files

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { formatFilename, ensureDirectoryExists, getExtensionForFormat, findRootChangelog, getRelativePath, findAllChangelogs } = require('../common/fileUtils');
const { getTemplateContent } = require('./templateManager');

/**
 * Generate a changelog file
 * @param {Object} options Generation options
 * @param {string} [options.targetDirectory] Target directory for the changelog
 * @param {string} [options.name] Name for the changelog
 * @param {string} [options.format] Format of the changelog (xml, yaml, json, sql)
 * @param {boolean} [options.isRoot] Whether this is a root changelog
 * @returns {Promise<string|null>} Path to the generated changelog or null if failed
 */
async function generateChangelog(options) {
    try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        
        // Set default format if not provided
        const format = options.format || config.get('defaultChangelogFormat') || 'xml';
        
        // Get file extension
        const extension = getExtensionForFormat(format);
        
        // Get target directory
        const targetDirectory = options.targetDirectory || config.get('changelogRootPath') || 'db/changelog';
        
        // Ensure directory exists
        if (!ensureDirectoryExists(targetDirectory)) {
            throw new Error(`Failed to create directory: ${targetDirectory}`);
        }
        
        // Get author from settings
        const author = config.get('defaultAuthor') || process.env.USER || process.env.USERNAME || 'unknown';
        
        // Generate preview filename pattern for InputBox
        const namingPattern = config.get('changelogNamingPattern') || 'changelog-{date}-{name}.{ext}';
        const dateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
        const dateValue = moment().format(dateFormat);
        
        // Ask if user wants to create a root changelog or a regular one
        const isRoot = await vscode.window.showQuickPick([
            { label: 'Root Changelog', detail: 'Main changelog that includes other changelogs', value: true },
            { label: 'Regular Changelog', detail: 'Changelog that can be included in a root changelog', value: false }
        ], {
                title: 'Changelog Type'
            });
            
        if (!isRoot) {
                return null; // User canceled
            }
            
        // Define the type based on user choice
        const type = isRoot.value ? 'root' : 'custom';
        
        // Prompt for name with live preview if not provided
        let name = options.name;
        let filename = '';
        
        if (!name) {
            // We'll use an input box with value changed handler to show preview
            const inputBox = vscode.window.createInputBox();
            inputBox.title = 'Changelog Name';
            inputBox.prompt = 'Enter a name for the changelog';
            
            // Use a promise to handle the async inputBox
            name = await new Promise(resolve => {
                inputBox.onDidChangeValue(value => {
                    if (value) {
                        // Generate preview with current value
                        const previewVars = {
                            name: value,
                            ext: extension,
                            author: author,
                            date: dateValue,
                            object: value,
                            release: value
                        };
                        
                        filename = formatFilename(namingPattern, previewVars);
                        // Use title to show preview without error styling
                        inputBox.title = `Changelog Name - Preview: ${filename}`;
                    } else {
                        inputBox.title = 'Changelog Name';
                    }
                });
                
                inputBox.onDidAccept(() => {
                    const value = inputBox.value;
                    inputBox.hide();
                    resolve(value);
                });
                
                inputBox.onDidHide(() => {
                    resolve(inputBox.value);
                });
                
                inputBox.show();
            });
            
            if (!name) {
                return null; // User canceled
            }
        } else {
            // If name was provided as an option, just generate the filename
        const filenameVariables = {
            name: name,
            ext: extension,
                author: author,
                date: dateValue,
                object: name,
                release: name
            };
            
            filename = formatFilename(namingPattern, filenameVariables);
        }
        
        const changelogPath = path.join(targetDirectory, filename);
        
        // Generate content
        const templateData = {
            name: name,
            description: '', // Description is not required
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            author: author,
            type: type
        };
        
        // Get appropriate template for the changelog type
        const content = getTemplateContent(
            format, 
            'changelog', 
            type, 
            templateData
        );
        
        // Write content to file
        fs.writeFileSync(changelogPath, content);
        
        // If this is not a root changelog, try to find parent changelogs and let user choose
        if (!isRoot.value) {
            const { connected, parentPath } = await connectToParentChangelog(changelogPath, format, targetDirectory);
            
            // If connected to a parent, show parent changelog first, then the new one
            if (connected && parentPath) {
                // Open both files side by side
                await openFilesInSplitView(parentPath, changelogPath);
            } else {
                // If not connected, just open the new changelog
                const doc = await vscode.workspace.openTextDocument(changelogPath);
                await vscode.window.showTextDocument(doc);
            }
        } else {
            // For root changelogs, just open the new file
            const doc = await vscode.workspace.openTextDocument(changelogPath);
            await vscode.window.showTextDocument(doc);
        }
        
        // No success message
        
        return changelogPath;
    } catch (error) {
        console.error('Error generating changelog:', error);
        vscode.window.showErrorMessage(`Failed to generate changelog: ${error.message}`);
        return null;
    }
}

/**
 * Find parent changelogs and let user choose which one to connect to
 * @param {string} changelogPath Path to the new changelog
 * @param {string} format Format of the new changelog
 * @param {string} targetDirectory Directory where the changelog was created
 * @returns {Promise<{connected: boolean, parentPath: string|null}>} Connection status and parent path
 */
async function connectToParentChangelog(changelogPath, format, targetDirectory) {
    try {
        // Find all potential parent changelogs
        const parentChangelogs = await findParentChangelogs(targetDirectory, changelogPath);
        
        if (parentChangelogs.length === 0) {
            // No parent changelogs found, just proceed without connecting
            console.log('No parent changelogs found in the directory hierarchy. The changelog will remain standalone.');
            return { connected: false, parentPath: null };
        } 
        else if (parentChangelogs.length === 1) {
            // Only one parent changelog found, ask if user wants to connect to it
            const parentPath = parentChangelogs[0];
            const parentName = path.basename(parentPath);
            
            const connectChoice = await vscode.window.showQuickPick([
                { label: 'Yes', description: `Connect to ${parentName}` },
                { label: 'No', description: 'Do not connect' }
            ], {
                placeHolder: `Found parent changelog: ${parentName}. Connect to it?`,
                title: 'Connect to Parent Changelog'
            });
            
            if (connectChoice && connectChoice.label === 'Yes') {
                const connected = await addToParentChangelog(parentPath, changelogPath);
                return { connected, parentPath: connected ? parentPath : null };
            }
            
            return { connected: false, parentPath: null };
        } 
        else {
            // Multiple parent changelogs found, let user choose
            const items = parentChangelogs.map(file => ({
                label: path.basename(file),
                description: file,
                file: file
            }));
            
            // Add option to not connect to any parent
            items.push({
                label: 'Don\'t connect to any parent changelog',
                description: 'Leave the changelog standalone',
                file: null
            });
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select parent changelog to connect to',
                title: 'Connect to Parent Changelog'
            });
            
            if (selected && selected.file) {
                const connected = await addToParentChangelog(selected.file, changelogPath);
                return { connected, parentPath: connected ? selected.file : null };
            }
            
            return { connected: false, parentPath: null };
        }
    } catch (error) {
        console.error('Error connecting to parent changelog:', error);
        // Don't show error message to user, just log it
        return { connected: false, parentPath: null };
    }
}

/**
 * Find potential parent changelogs for the given directory
 * @param {string} targetDirectory Directory where the changelog was created
 * @param {string} newChangelogPath Path to the newly created changelog (to exclude from results)
 * @returns {Promise<string[]>} Array of parent changelog paths
 */
async function findParentChangelogs(targetDirectory, newChangelogPath) {
    try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        
        // Get all formats
        const formats = ['xml', 'yaml', 'yml', 'json'];
        
        // Get all potential parent directories (current and up)
        const parentDirs = [];
        let currentDir = targetDirectory;
        
        // Add current directory first
        parentDirs.push(currentDir);
        
        // Get workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspacePath = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';
        
        // Add parent directories up to workspace root
        while (currentDir !== workspacePath && path.dirname(currentDir) !== currentDir) {
            currentDir = path.dirname(currentDir);
            parentDirs.push(currentDir);
            
            // Stop if we reached the workspace root
            if (currentDir === workspacePath) {
                break;
            }
        }
        
        // Collect all potential parent changelogs by directory level
        const changelogsByLevel = {};
        
        // For each directory level, find potential changelog files
        for (let i = 0; i < parentDirs.length; i++) {
            const dir = parentDirs[i];
            const levelChangelogs = [];
            
            try {
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    
                    // Skip directories
                    if (fs.statSync(filePath).isDirectory()) {
                        continue;
                    }
                    
                    // Skip the newly created changelog
                    if (newChangelogPath && filePath === newChangelogPath) {
                        continue;
                    }
                    
                    // Check file extension
                    const ext = path.extname(file).substring(1).toLowerCase();
                    if (!formats.includes(ext)) {
                        continue;
                    }
                    
                    // Check if the file name matches changelog pattern
                    // Either it matches the naming pattern from settings or it contains specific keywords
                    const fileName = path.basename(file).toLowerCase();
                    
                    // Check if the file is a potential parent changelog
                    const isParentChangelog = isChangelog(filePath, fileName);
                    
                    if (isParentChangelog) {
                        levelChangelogs.push(filePath);
                    }
                }
            } catch (error) {
                console.error(`Error reading directory ${dir}:`, error);
            }
            
            // If we found changelogs at this level, store them
            if (levelChangelogs.length > 0) {
                changelogsByLevel[i] = levelChangelogs;
            }
        }
        
        // Get the closest level with changelogs
        const levels = Object.keys(changelogsByLevel).map(Number).sort();
        
        if (levels.length === 0) {
            // No changelogs found at any level
            return [];
        }
        
        // Return changelogs from the closest level
        return changelogsByLevel[levels[0]];
    } catch (error) {
        console.error('Error finding parent changelogs:', error);
        return [];
    }
}

/**
 * Check if a file is a potential changelog for inclusion
 * @param {string} filePath Path to the file
 * @param {string} fileName Name of the file (lowercase)
 * @returns {boolean} True if the file is a potential changelog
 */
function isChangelog(filePath, fileName) {
    try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        
        // Get changelog naming pattern
        const namingPattern = config.get('changelogNamingPattern') || 'changelog-{date}-{name}.{ext}';
        
        // Convert naming pattern to a rough regex by replacing variables with wildcards
        const patternRegex = namingPattern
            .replace(/\{date\}/g, '.*')
            .replace(/\{name\}/g, '.*')
            .replace(/\{author\}/g, '.*') 
            .replace(/\{ext\}/g, '.*')
            .replace(/\{object\}/g, '.*')
            .replace(/\{release\}/g, '.*')
            .replace(/\./g, '\\.')
            .replace(/\-/g, '\\-');
        
        const regex = new RegExp(`^${patternRegex}$`, 'i');
        
        // Check if the filename matches the pattern
        if (regex.test(fileName)) {
            return true;
        }
        
        // Check if it contains changelog keywords in filename
        if (fileName.includes('changelog') || 
            fileName.includes('master') || 
            fileName.includes('root')) {
            return true;
        }
        
        // Check file content for include statements
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('<include') || 
            content.includes('- include:') ||
            content.includes('"include"')) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error checking if ${filePath} is a changelog:`, error);
        return false;
    }
}

/**
 * Add the changelog to a parent changelog
 * @param {string} parentPath Path to the parent changelog
 * @param {string} changelogPath Path to the changelog to add
 * @returns {Promise<boolean>} True if added successfully
 */
async function addToParentChangelog(parentPath, changelogPath) {
    try {
        // Get relative path from parent to the new changelog
        const relativePath = getRelativePath(parentPath, changelogPath);
        
        // Read the parent changelog content
        const parentContent = fs.readFileSync(parentPath, 'utf8');
        
        // Check if the changelog is already included
        if (parentContent.includes(relativePath)) {
            // Already included, no need to show message
            return true;
        }
        
        // Get file extension to determine format
        const parentExt = path.extname(parentPath).substring(1).toLowerCase();
        
        // Update the parent changelog
        let updatedContent;
        
        switch (parentExt) {
            case 'xml':
                // Add include tag before the closing databaseChangeLog tag
                updatedContent = parentContent.replace(
                    /<\/databaseChangeLog>\s*$/,
                    `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
                );
                break;
                
            case 'yaml':
            case 'yml':
                // Add include item at the end
                updatedContent = parentContent + `\n  - include:\n      file: ${relativePath}\n`;
                break;
                
            case 'json':
                // Add include to the databaseChangeLog array
                // This is more complex and would require parsing the JSON
                // Simplified version:
                const jsonObj = JSON.parse(parentContent);
                if (Array.isArray(jsonObj.databaseChangeLog)) {
                    jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
                    updatedContent = JSON.stringify(jsonObj, null, 2);
                } else {
                    throw new Error('Invalid parent changelog JSON structure');
                }
                break;
                
            default:
                throw new Error(`Unsupported format for parent changelog: ${parentExt}`);
        }
        
        // Write updated content back to the file
        fs.writeFileSync(parentPath, updatedContent);
        
        // Return true to indicate successful connection, no message
        return true;
    } catch (error) {
        console.error('Error adding to parent changelog:', error);
        // Don't show error message to user, just log it
        return false;
    }
}

/**
 * Open two files as tabs
 * @param {string} file1 Path to first file
 * @param {string} file2 Path to second file
 */
async function openFilesInSplitView(file1, file2) {
    try {
        // Open first file
        const doc1 = await vscode.workspace.openTextDocument(file1);
        await vscode.window.showTextDocument(doc1, { preview: false });
        
        // Open second file in the same column
        const doc2 = await vscode.workspace.openTextDocument(file2);
        await vscode.window.showTextDocument(doc2, { 
            viewColumn: vscode.window.activeTextEditor?.viewColumn,
            preview: false  // Prevent preview mode to ensure it opens as a stable tab
        });
    } catch (error) {
        console.error('Error opening files as tabs:', error);
        
        // Fallback to regular opening
        const doc = await vscode.workspace.openTextDocument(file2);
        await vscode.window.showTextDocument(doc);
    }
}

module.exports = {
    generateChangelog
}; 