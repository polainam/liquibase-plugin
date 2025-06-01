const vscode = require('vscode');
const fsPromises = require('fs').promises;
const path = require('path');
const { getRelativePath } = require('../common/fileOperations');

function getUpdatedChangelogContent(format, parentContent, relativePath) {
  switch (format) {
      case 'xml':
          return parentContent.replace(
              /<\/databaseChangeLog>\s*$/,
              `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
          );

      case 'yaml':
      case 'yml':
          return parentContent + `\n  - include:\n      file: ${relativePath}\n`;

      case 'json': {
          const jsonObj = JSON.parse(parentContent);
          if (Array.isArray(jsonObj.databaseChangeLog)) {
              jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
              return JSON.stringify(jsonObj, null, 2);
          } else {
              throw new Error('Invalid parent changelog JSON structure');
          }
      }

      default:
          throw new Error(`Unsupported format for parent changelog: ${format}`);
  }
}

async function addToChangelogFile(parentPath, childPath, options = { showInfoMessageIfExists: false }) {
    try {
        const relativePath = getRelativePath(parentPath, childPath);
        const parentContent = await fsPromises.readFile(parentPath, 'utf8');

        if (parentContent.includes(relativePath)) {
            if (options.showInfoMessageIfExists) {
                vscode.window.showInformationMessage('This file is already included in the changelog.');
            }
            return true;
        }

        const format = path.extname(parentPath).substring(1).toLowerCase();
        const updatedContent = getUpdatedChangelogContent(format, parentContent, relativePath);

        await fsPromises.writeFile(parentPath, updatedContent);
        return true;

    } catch (error) {
        console.error('Error updating changelog file:', error);
        vscode.window.showErrorMessage(`Failed to update changelog: ${error.message}`);
        return false;
    }
}

module.exports = {
    addToChangelogFile
};
