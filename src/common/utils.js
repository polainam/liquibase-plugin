// General utility functions

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Creates a temporary file with content
 * @param {string} content File content
 * @param {string} prefix File name prefix
 * @param {string} extension File extension
 * @returns {string} Path to the temporary file
 */
function createTempFile(content, prefix = 'temp', extension = '.xml') {
    const tempFileName = `${prefix}_${Date.now()}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    // If it's an XML file and doesn't have an XML declaration, add it
    if (extension.toLowerCase() === '.xml' && !content.trim().startsWith('<?xml')) {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n' + content;
    }
    
    fs.writeFileSync(tempFilePath, content);
    return tempFilePath;
  }

/**
 * Deletes a file if it exists
 * @param {string} filePath Path to the file
 */
function deleteFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err);
  }
}

/**
 * Determines if a file is a YAML file based on its extension
 * @param {string} filePath Path to the file
 * @returns {boolean} True if it's a YAML file
 */
function isYamlFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.yaml' || ext === '.yml';
}

module.exports = {
  createTempFile,
  deleteFileIfExists,
  isYamlFile
};