// Delegator that routes to the appropriate format handler (XML or YAML)

const vscode = require('vscode');
const path = require('path');
const xmlExtractor = require('./xml/sql/changesetExtractorXml');
const yamlExtractor = require('./yaml/sql/changesetExtractorYaml');

/**
 * Determines if the file is a YAML file based on extension
 * @param {string} filePath Path to the file
 * @returns {boolean} True if it's a YAML file
 */
function isYamlFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.yaml' || ext === '.yml';
}

/**
 * Extracts changeset information at cursor position
 * @param {string} content The file content (XML or YAML)
 * @param {number} cursorPosition The cursor position in the document
 * @param {string} filePath Path to the file
 * @returns {Promise<{id: string, author: string}|null>} Changeset info or null
 */
async function extractChangesetInfoAtCursor(content, cursorPosition, filePath) {
  if (isYamlFile(filePath)) {
    return yamlExtractor.extractChangesetInfoAtCursor(content, cursorPosition);
  } else {
    return xmlExtractor.extractChangesetInfoAtCursor(content, cursorPosition);
  }
}

/**
 * Parse all changesets from the file
 * @param {string} content File content (XML or YAML)
 * @param {string} filePath Path to the file
 * @returns {Promise<Array<{id: string, author: string, label: string}>>} List of all changesets
 */
async function getAllChangesets(content, filePath) {
  if (isYamlFile(filePath)) {
    return yamlExtractor.getAllChangesets(content);
  } else {
    return xmlExtractor.getAllChangesets(content);
  }
}

/**
 * Finds a specific changeset in the content
 * @param {string} content The file content (XML or YAML)
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @param {string} filePath Path to the file
 * @returns {Promise<any|null>} The changeset object or null
 */
async function findChangeset(content, id, author, filePath) {
  if (isYamlFile(filePath)) {
    return yamlExtractor.findChangeset(content, id, author);
  } else {
    return xmlExtractor.findChangeset(content, id, author);
  }
}

module.exports = {
  extractChangesetInfoAtCursor,
  getAllChangesets,
  findChangeset,
  isYamlFile
};
