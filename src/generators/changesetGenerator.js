// Generator for changeset files

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { formatFilename, ensureDirectoryExists, getExtensionForFormat, getRelativePath } = require('../common/fileUtils');
const { getTemplateContent } = require('./templateManager');

/**
 * Extract variables from naming pattern
 * @param {string} pattern Naming pattern
 * @returns {string[]} Array of variable names
 */
function extractVariablesFromPattern(pattern) {
    const matches = pattern.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
}

/**
 * Generate a changeset file
 * @param {Object} options Generation options
 * @param {string} [options.targetDirectory] Target directory for the changeset
 * @param {string} [options.name] Name for the changeset
 * @param {string} [options.format] Format of the changeset (xml, yaml, json, sql)
 * @returns {Promise<string|null>} Path to the generated changeset or null if failed
 */
async function generateChangeset(options) {
    try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        
        // Set default format if not provided
        const format = options.format || config.get('defaultChangesetFormat') || 'xml';
        
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
        
        // Get naming pattern and date format
        const namingPattern = config.get('changesetNamingPattern') || 'changeset-{date}-{name}.{ext}';
        const dateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
        const dateValue = moment().format(dateFormat);
        
        // Extract variables from pattern
        const variables = extractVariablesFromPattern(namingPattern);
        
        // Set basic values for variables
        const variableValues = {
            ext: extension,
            author: author,
            date: dateValue
        };
        
        // If name was provided as an option, use it for all name-related variables
        if (options.name) {
            variableValues.name = options.name;
            variableValues.object = options.name;
            variableValues.release = options.name;
        } else {
            // Prompt for each variable that needs user input
            for (const variable of variables) {
                // Skip variables that are already set
                if (variableValues[variable] !== undefined) {
                    continue;
                }
                
                // Skip {ext} as it's handled automatically
                if (variable === 'ext') {
                    continue;
                }
                
                // Create input box for the variable
                const inputBox = vscode.window.createInputBox();
                inputBox.title = `Changeset ${variable.charAt(0).toUpperCase() + variable.slice(1)}`;
                inputBox.prompt = `Enter ${variable} for the changeset`;
                
                // Use a promise to handle the async inputBox
                const value = await new Promise(resolve => {
                    inputBox.onDidChangeValue(value => {
                        if (value) {
                            // Generate preview with current values
                            const previewVars = {
                                ...variableValues,
                                [variable]: value
                            };
                            
                            const filename = formatFilename(namingPattern, previewVars);
                            inputBox.title = `Changeset ${variable.charAt(0).toUpperCase() + variable.slice(1)} - Preview: ${filename}`;
                        } else {
                            inputBox.title = `Changeset ${variable.charAt(0).toUpperCase() + variable.slice(1)}`;
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
                
                if (!value) {
                    return null; // User canceled
                }
                
                // Store the value
                variableValues[variable] = value;
            }
        }
        
        // Generate filename
        const filename = formatFilename(namingPattern, variableValues);
        const changesetPath = path.join(targetDirectory, filename);
        
        // Generate changeset id (filename without extension)
        const changesetId = path.basename(filename, path.extname(filename));
        
        // Generate content
        const templateData = {
            id: changesetId,
            name: variableValues.name || '',
            description: '', // Description is not required
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            author: author
        };
        
        // Get appropriate template for the changeset
        const content = getTemplateContent(
            format, 
            'changeset', 
            'standard', 
            templateData
        );
        
        // Write content to file
        fs.writeFileSync(changesetPath, content);
        
        // Check if there's a folder mapping for the target directory
        const folderMappings = config.get('folderChangelogMappings') || {};
        const associatedChangelog = folderMappings[targetDirectory];
        
        if (associatedChangelog && fs.existsSync(associatedChangelog)) {
            // Automatically connect to the mapped changelog
            const connected = await addToChangelog(associatedChangelog, changesetPath);
            
            if (connected) {
                // Open both files in split view
                await openFilesInSplitView(associatedChangelog, changesetPath);
                return changesetPath;
            }
        }
        
        // Ask if user wants to connect this changeset to a changelog
        const connectToChangelog = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Connect this changeset to a changelog' },
                { label: 'No', description: 'Keep this changeset standalone' }
            ],
            {
                placeHolder: 'Do you want to connect this changeset to a changelog?',
                title: 'Connect to Changelog'
            }
        );
        
        if (connectToChangelog && connectToChangelog.label === 'Yes') {
            // Let user pick a changelog file
            const changelogUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select Changelog',
                filters: {
                    'Changelogs': ['xml', 'yaml', 'yml', 'json']
                },
                title: 'Select changelog to connect this changeset to'
            });
            
            if (changelogUri && changelogUri.length > 0) {
                const changelogPath = changelogUri[0].fsPath;
                
                // Connect the changeset to the selected changelog
                const connected = await addToChangelog(changelogPath, changesetPath);
                
                if (connected) {
                    // Ask if user wants to automatically connect all future changesets from this folder
                    const rememberFolder = await vscode.window.showQuickPick(
                        [
                            { label: 'Yes', description: 'Connect all future changesets from this folder' },
                            { label: 'No', description: 'Ask each time' }
                        ],
                        {
                            placeHolder: 'Connect all future changesets from this folder to this changelog?',
                            title: 'Remember Preference'
                        }
                    );
                    
                    if (rememberFolder && rememberFolder.label === 'Yes') {
                        // Store the folder preference
                        const folderPreferences = config.get('folderChangelogMappings') || {};
                        folderPreferences[targetDirectory] = changelogPath;
                        
                        // Update configuration
                        await config.update('folderChangelogMappings', folderPreferences, true);
                        
                        vscode.window.showInformationMessage(`All changesets created in ${targetDirectory} will be connected to this changelog automatically.`);
                    } else {
                        vscode.window.showInformationMessage('You can configure this later in the Liquibase Plugin Settings.');
                    }
                    
                    // Open both files in split view
                    await openFilesInSplitView(changelogPath, changesetPath);
                    
                    return changesetPath;
                }
            }
        }
        
        // If we didn't connect to a changelog or the connection failed, just open the changeset
        const doc = await vscode.workspace.openTextDocument(changesetPath);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Set cursor position
        if (editor) {
            setCursorToOptimalPosition(editor, changesetPath);
        }
        
        return changesetPath;
    } catch (error) {
        console.error('Error generating changeset:', error);
        vscode.window.showErrorMessage(`Failed to generate changeset: ${error.message}`);
        return null;
    }
}

/**
 * Add the changeset to a changelog
 * @param {string} changelogPath Path to the changelog
 * @param {string} changesetPath Path to the changeset to add
 * @returns {Promise<boolean>} True if added successfully
 */
async function addToChangelog(changelogPath, changesetPath) {
    try {
        // Get relative path from changelog to the changeset
        const relativePath = getRelativePath(changelogPath, changesetPath);
        
        // Read the changelog content
        const changelogContent = fs.readFileSync(changelogPath, 'utf8');
        
        // Check if the changeset is already included
        if (changelogContent.includes(relativePath)) {
            vscode.window.showInformationMessage('This changeset is already included in the changelog.');
            return true;
        }
        
        // Get file extension to determine format
        const changelogExt = path.extname(changelogPath).substring(1).toLowerCase();
        
        // Update the changelog
        let updatedContent;
        
        switch (changelogExt) {
            case 'xml':
                // Add include tag before the closing databaseChangeLog tag
                updatedContent = changelogContent.replace(
                    /<\/databaseChangeLog>\s*$/,
                    `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
                );
                break;
                
            case 'yaml':
            case 'yml':
                // Add include item at the end
                updatedContent = changelogContent + `\n  - include:\n      file: ${relativePath}\n`;
                break;
                
            case 'json':
                // Add include to the databaseChangeLog array
                const jsonObj = JSON.parse(changelogContent);
                if (Array.isArray(jsonObj.databaseChangeLog)) {
                    jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
                    updatedContent = JSON.stringify(jsonObj, null, 2);
                } else {
                    throw new Error('Invalid changelog JSON structure');
                }
                break;
                
            default:
                throw new Error(`Unsupported format for changelog: ${changelogExt}`);
        }
        
        // Write updated content back to the file
        fs.writeFileSync(changelogPath, updatedContent);
        
        return true;
    } catch (error) {
        console.error('Error adding to changelog:', error);
        vscode.window.showErrorMessage(`Failed to connect changeset to changelog: ${error.message}`);
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
        const editor = await vscode.window.showTextDocument(doc2, { 
            viewColumn: vscode.window.activeTextEditor?.viewColumn,
            preview: false  // Prevent preview mode to ensure it opens as a stable tab
        });
        
        // Set cursor position in the changeset file based on format
        if (editor) {
            setCursorToOptimalPosition(editor, file2);
        }
    } catch (error) {
        console.error('Error opening files as tabs:', error);
        
        // Fallback to regular opening
        const doc = await vscode.workspace.openTextDocument(file2);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Set cursor position even in fallback
        if (editor) {
            setCursorToOptimalPosition(editor, file2);
        }
    }
}

/**
 * Set the cursor to the optimal position based on file format
 * @param {vscode.TextEditor} editor The text editor
 * @param {string} filePath Path to the file
 */
function setCursorToOptimalPosition(editor, filePath) {
    try {
        // Find the CURSOR_POSITION marker in the document
        const cursorLineNum = findLineContaining(editor.document, 'CURSOR_POSITION');
        
        if (cursorLineNum >= 0) {
            // Get the line with the marker
            const line = editor.document.lineAt(cursorLineNum);
            const lineText = line.text;
            
            // Calculate the position where the marker starts
            const markerIndex = lineText.indexOf('CURSOR_POSITION');
            
            // Get the position before the marker
            const newPosition = new vscode.Position(
                cursorLineNum,
                markerIndex
            );
            
            // Remove the marker from the document
            editor.edit(editBuilder => {
                const markerRange = new vscode.Range(
                    cursorLineNum,
                    markerIndex,
                    cursorLineNum,
                    markerIndex + 'CURSOR_POSITION'.length
                );
                editBuilder.delete(markerRange);
            }).then(() => {
                // Set the cursor at the position where the marker was
                editor.selection = new vscode.Selection(newPosition, newPosition);
                
                // Scroll to make the cursor visible
                editor.revealRange(
                    new vscode.Range(newPosition, newPosition),
                    vscode.TextEditorRevealType.InCenter
                );
            });
        }
    } catch (error) {
        console.error('Error setting cursor position:', error);
        // Fallback - don't change cursor position
    }
}

/**
 * Find the line containing a specific string
 * @param {vscode.TextDocument} document The document to search in
 * @param {string} searchString The string to search for
 * @returns {number} The line number or -1 if not found
 */
function findLineContaining(document, searchString) {
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.text.includes(searchString)) {
            return i;
        }
    }
    return -1;
}

module.exports = {
    generateChangeset
}; 