// Generator for changelog files

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { formatFilename, ensureDirectoryExists, getExtensionForFormat, findRootChangelog, getRelativePath } = require('../common/fileUtils');
const { getTemplateContent } = require('./templateManager');

/**
 * Generate a changelog file
 * @param {Object} options Generation options
 * @param {string} [options.targetDirectory] Target directory for the changelog
 * @param {string} [options.name] Name for the changelog
 * @param {string} [options.format] Format of the changelog (xml, yaml, json, sql)
 * @param {string} [options.description] Description of the changelog
 * @param {string} [options.type] Type of the changelog (root, object, release, custom)
 * @param {Object} [options.typeDetails] Details specific to the changelog type
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
        
        // Prompt for name if not provided
        let name = options.name;
        if (!name) {
            name = await vscode.window.showInputBox({
                title: 'Changelog Name',
                prompt: 'Enter a name for the changelog',
                placeHolder: 'my-changelog'
            });
            
            if (!name) {
                return null; // User canceled
            }
        }
        
        // Get description if not provided
        let description = options.description;
        if (!description) {
            description = await vscode.window.showInputBox({
                title: 'Changelog Description',
                prompt: 'Enter a description for the changelog (optional)',
                placeHolder: 'Description of changelog purpose'
            });
        }
        
        // Get the changelog type if not provided
        let type = options.type;
        let typeDetails = options.typeDetails || {};
        
        if (!type) {
            const typeOptions = [
                { label: 'Root Changelog', detail: 'Main changelog that includes other changelogs', value: 'root' },
                { label: 'Object Changelog', detail: 'Changelog for specific object type (tables, views, etc.)', value: 'object' },
                { label: 'Release Changelog', detail: 'Changelog for a specific release version', value: 'release' },
                { label: 'Custom Changelog', detail: 'Custom changelog type', value: 'custom' }
            ];
            
            const selectedType = await vscode.window.showQuickPick(typeOptions, {
                placeHolder: 'Select changelog type',
                title: 'Changelog Type'
            });
            
            if (!selectedType) {
                return null; // User canceled
            }
            
            type = selectedType.value;
            
            // Get additional type-specific details
            if (type === 'object') {
                // Get object type
                const objectTypeOptions = [
                    { label: 'Tables', value: 'tables' },
                    { label: 'Indexes', value: 'indexes' },
                    { label: 'Views', value: 'views' },
                    { label: 'Procedures', value: 'procedures' },
                    { label: 'Functions', value: 'functions' },
                    { label: 'Other', value: 'other' }
                ];
                
                const selectedObjectType = await vscode.window.showQuickPick(objectTypeOptions, {
                    placeHolder: 'Select object type',
                    title: 'Object Type'
                });
                
                if (!selectedObjectType) {
                    return null; // User canceled
                }
                
                typeDetails.objectType = selectedObjectType.value;
                
                if (selectedObjectType.value === 'other') {
                    const customType = await vscode.window.showInputBox({
                        title: 'Custom Object Type',
                        prompt: 'Enter a custom object type',
                        placeHolder: 'sequences'
                    });
                    
                    if (!customType) {
                        return null; // User canceled
                    }
                    
                    typeDetails.objectType = customType;
                }
                
                // Get object name (optional)
                typeDetails.objectName = await vscode.window.showInputBox({
                    title: 'Object Name',
                    prompt: 'Enter a name for the object (optional)',
                    placeHolder: 'users'
                });
            } else if (type === 'release') {
                // Get release version
                typeDetails.version = await vscode.window.showInputBox({
                    title: 'Release Version',
                    prompt: 'Enter the release version',
                    placeHolder: '1.0'
                });
                
                if (!typeDetails.version) {
                    return null; // User canceled
                }
                
                // Get release description (optional)
                typeDetails.releaseDescription = await vscode.window.showInputBox({
                    title: 'Release Description',
                    prompt: 'Enter a description for the release (optional)',
                    placeHolder: 'Initial release'
                });
            } else if (type === 'custom') {
                // Get custom type
                typeDetails.customType = await vscode.window.showInputBox({
                    title: 'Custom Type',
                    prompt: 'Enter a custom type for the changelog',
                    placeHolder: 'migrations'
                });
                
                if (!typeDetails.customType) {
                    return null; // User canceled
                }
            }
        }
        
        // Determine changelog destination directory
        let targetDirectory = options.targetDirectory;
        if (!targetDirectory) {
            // Get default root path from settings
            const defaultRoot = config.get('changelogRootPath') || 'db/changelog';
            
            // For object-oriented approach, use object-specific directory
            if (type === 'object' && typeDetails.objectType) {
                const objectDirs = config.get('objectDirectories') || {};
                const objectTypeDir = objectDirs[typeDetails.objectType] || typeDetails.objectType;
                targetDirectory = path.join(defaultRoot, objectTypeDir);
            } else if (type === 'release' && typeDetails.version) {
                // For release-oriented approach, use version directory
                const versionBase = typeDetails.version.split('.')[0];
                targetDirectory = path.join(defaultRoot, `${versionBase}.X`);
            } else {
                targetDirectory = defaultRoot;
            }
        }
        
        // Ensure directory exists
        if (!ensureDirectoryExists(targetDirectory)) {
            throw new Error(`Failed to create directory: ${targetDirectory}`);
        }
        
        // Generate filename using pattern
        const namingPattern = config.get('changelogNamingPattern') || 'changelog-{date}-{name}.{ext}';
        
        // Add type info to filename variables if applicable
        const filenameVariables = {
            name: name,
            ext: extension,
            author: process.env.USER || process.env.USERNAME || 'unknown'
        };
        
        // Add type-specific details to filename
        if (type === 'object' && typeDetails.objectType) {
            filenameVariables.objectType = typeDetails.objectType;
            if (typeDetails.objectName) {
                filenameVariables.objectName = typeDetails.objectName;
            }
        } else if (type === 'release' && typeDetails.version) {
            filenameVariables.version = typeDetails.version;
        }
        
        const filename = formatFilename(namingPattern, filenameVariables);
        const changelogPath = path.join(targetDirectory, filename);
        
        // Generate content
        const templateData = {
            name: name,
            description: description || '',
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            author: process.env.USER || process.env.USERNAME || 'unknown',
            type: type,
            typeDetails: typeDetails
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
        
        // If this is not a root changelog, try to find a root changelog and update it
        if (type !== 'root') {
            await updateRootChangelog(changelogPath, format);
        }
        
        // Open the file in editor
        const doc = await vscode.workspace.openTextDocument(changelogPath);
        await vscode.window.showTextDocument(doc);
        
        // Show success message
        vscode.window.showInformationMessage(`Changelog created: ${filename}`);
        
        return changelogPath;
    } catch (error) {
        console.error('Error generating changelog:', error);
        vscode.window.showErrorMessage(`Failed to generate changelog: ${error.message}`);
        return null;
    }
}

/**
 * Update root changelog to include the new changelog
 * @param {string} changelogPath Path to the new changelog
 * @param {string} format Format of the new changelog
 * @returns {Promise<boolean>} True if the root changelog was updated
 */
async function updateRootChangelog(changelogPath, format) {
    try {
        // Find root changelog
        const rootChangelog = await findRootChangelog();
        
        if (!rootChangelog) {
            const createRoot = await vscode.window.showInformationMessage(
                'No root changelog found. Would you like to create one?',
                'Yes', 'No'
            );
            
            if (createRoot === 'Yes') {
                const rootFormat = format; // Use same format as the new changelog
                const config = vscode.workspace.getConfiguration('liquibaseGenerator');
                const defaultRoot = config.get('changelogRootPath') || 'db/changelog';
                
                // Create root changelog with appropriate properties
                const rootPath = await generateChangelog({
                    targetDirectory: defaultRoot,
                    name: 'master',
                    format: rootFormat,
                    description: 'Master changelog file that includes all other changelogs',
                    type: 'root'
                });
                
                if (rootPath) {
                    return await updateRootChangelog(changelogPath, format);
                }
            }
            
            return false;
        }
        
        // Check if root changelog has the right format
        const rootFormat = path.extname(rootChangelog).substring(1);
        
        // Get relative path from root to the new changelog
        const relativePath = getRelativePath(rootChangelog, changelogPath);
        
        // Read the root changelog content
        const rootContent = fs.readFileSync(rootChangelog, 'utf8');
        
        // Check if the changelog is already included
        if (rootContent.includes(relativePath)) {
            vscode.window.showInformationMessage('Changelog is already included in the root changelog.');
            return false;
        }
        
        // Update the root changelog
        let updatedContent;
        
        switch (rootFormat) {
            case 'xml':
                // Add include tag before the closing databaseChangeLog tag
                updatedContent = rootContent.replace(
                    /<\/databaseChangeLog>\s*$/,
                    `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
                );
                break;
                
            case 'yaml':
            case 'yml':
                // Add include item at the end
                updatedContent = rootContent + `\n- include:\n    file: ${relativePath}\n`;
                break;
                
            case 'json':
                // Add include to the databaseChangeLog array
                // This is more complex and would require parsing the JSON
                // Simplified version:
                const jsonObj = JSON.parse(rootContent);
                if (Array.isArray(jsonObj.databaseChangeLog)) {
                    jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
                    updatedContent = JSON.stringify(jsonObj, null, 2);
                } else {
                    throw new Error('Invalid root changelog JSON structure');
                }
                break;
                
            default:
                throw new Error(`Unsupported format for root changelog: ${rootFormat}`);
        }
        
        // Write updated content back to the file
        fs.writeFileSync(rootChangelog, updatedContent);
        
        vscode.window.showInformationMessage(`Changelog was added to root changelog: ${path.basename(rootChangelog)}`);
        return true;
    } catch (error) {
        console.error('Error updating root changelog:', error);
        vscode.window.showErrorMessage(`Failed to update root changelog: ${error.message}`);
        return false;
    }
}

module.exports = {
    generateChangelog
}; 