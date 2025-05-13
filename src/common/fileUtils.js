// Utilities for file operations

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Format filename using pattern and variables
 * @param {string} pattern Filename pattern (e.g., 'changelog-{date}-{name}.{ext}')
 * @param {Object} variables Variables to replace in pattern
 * @returns {string} Formatted filename
 */
function formatFilename(pattern, variables) {
    let result = pattern;
    
    // Replace date if present
    if (pattern.includes('{date}')) {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        const dateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
        result = result.replace('{date}', moment().format(dateFormat));
    }
    
    // Replace other variables
    for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, value);
        }
    }
    
    return result;
}

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} dirPath Path to directory
 * @returns {boolean} True if directory exists or was created
 */
function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error(`Error creating directory ${dirPath}:`, error);
        return false;
    }
}

/**
 * Get extension for file format
 * @param {string} format File format (xml, yaml, json, sql)
 * @returns {string} File extension
 */
function getExtensionForFormat(format) {
    switch (format.toLowerCase()) {
        case 'xml': return 'xml';
        case 'yaml': return 'yaml';
        case 'yml': return 'yml';
        case 'json': return 'json';
        case 'sql': return 'sql';
        default: return format.toLowerCase();
    }
}

/**
 * Find root changelog file in the project
 * @param {string[]} [formats] Optional array of formats to look for (default: ['xml', 'yaml', 'json'])
 * @returns {Promise<string|null>} Path to root changelog or null if not found
 */
async function findRootChangelog(formats = ['xml', 'yaml', 'json']) {
    // Common names for root changelogs
    const rootNames = [
        'changelog-master',
        'changelog-root',
        'master-changelog',
        'root-changelog',
        'db-changelog-master',
        'liquibase-changelog-master'
    ];
    
    // Create glob pattern
    const namePattern = `**/{${rootNames.join(',')}}`;
    const extPattern = formats.map(f => getExtensionForFormat(f)).join(',');
    const globPattern = `${namePattern}.{${extPattern}}`;
    
    // Find files matching the pattern
    const files = await vscode.workspace.findFiles(globPattern, '**/node_modules/**');
    
    if (files.length === 0) {
        return null;
    } else if (files.length === 1) {
        return files[0].fsPath;
    } else {
        // If multiple root changelogs are found, ask user to choose
        const items = files.map(file => ({
            label: path.basename(file.fsPath),
            description: file.fsPath,
            file: file.fsPath
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Multiple root changelogs found. Please select one.',
            title: 'Select Root Changelog'
        });
        
        return selected ? selected.file : null;
    }
}

/**
 * Find all changelog files in the project
 * @param {string[]} [formats] Optional array of formats to look for (default: ['xml', 'yaml', 'json'])
 * @returns {Promise<string[]>} Array of changelog paths
 */
async function findAllChangelogs(formats = ['xml', 'yaml', 'json']) {
    const extPattern = formats.map(f => getExtensionForFormat(f)).join(',');
    const globPattern = `**/*changelog*.{${extPattern}}`;
    
    const files = await vscode.workspace.findFiles(globPattern, '**/node_modules/**');
    return files.map(file => file.fsPath);
}

/**
 * Get relative path between files
 * @param {string} fromFile Path to source file
 * @param {string} toFile Path to target file
 * @returns {string} Relative path from source to target
 */
function getRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    return path.relative(fromDir, toFile).replace(/\\/g, '/');
}

module.exports = {
    formatFilename,
    ensureDirectoryExists,
    getExtensionForFormat,
    findRootChangelog,
    findAllChangelogs,
    getRelativePath
}; 