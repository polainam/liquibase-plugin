const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const moment = require('moment');
const vscode = require('vscode');

function formatFilename(pattern, variables) {
    let result = pattern;

    if (pattern.includes('{date}')) {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        const dateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
        result = result.replace('{date}', moment().format(dateFormat));
    }

    for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, value);
        }
    }

    return result;
}

function getRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    return path.relative(fromDir, toFile).replace(/\\/g, '/');
}

function createTempFile(content, prefix = 'temp', extension = '.xml') {
    const tempFileName = `${prefix}_${Date.now()}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    if (extension.toLowerCase() === '.xml' && !content.trim().startsWith('<?xml')) {
        content = '<?xml version="1.0" encoding="UTF-8"?>\n' + content;
    }

    fs.writeFileSync(tempFilePath, content);
    return tempFilePath;
}

function deleteFileIfExists(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error(`Failed to delete file ${filePath}:`, err);
    }
}

async function writeFile(filePath, content) {
    try {
        await fsPromises.writeFile(filePath, content);
    } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
    }
}

module.exports = {
    formatFilename,
    getRelativePath,
    createTempFile,
    deleteFileIfExists,
    writeFile
};