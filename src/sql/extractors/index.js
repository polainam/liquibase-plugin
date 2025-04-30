const path = require('path');
const XmlExtractor = require('./xmlExtractor');
const YamlExtractor = require('./yamlExtractor');

// Cache of extractors
const extractorInstances = {
  xml: XmlExtractor,
  yaml: YamlExtractor
};

/**
 * Determines file format from extension
 */
function getFileFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xml') return 'xml';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  throw new Error(`Unsupported file format: ${ext}`);
}

/**
 * Checks if a file is YAML based on extension
 * @param {string} filePath Path to the file
 * @returns {boolean} True if it's a YAML file
 */
function isYamlFile(filePath) {
  try {
    return getFileFormat(filePath) === 'yaml';
  } catch (e) {
    return false;
  }
}

/**
 * Returns extractor for specified format
 */
function getExtractorForFormat(format) {
  const extractor = extractorInstances[format];
  if (!extractor) {
    throw new Error(`No extractor available for format: ${format}`);
  }
  return extractor;
}

/**
 * Returns extractor for specified file
 */
function getExtractorForFile(filePath) {
  const format = getFileFormat(filePath);
  return getExtractorForFormat(format);
}

/**
 * Extracts changeset information at cursor position
 * @param {string} content The file content (XML or YAML)
 * @param {number} cursorPosition The cursor position in the document
 * @param {string} filePath Path to the file
 * @returns {Promise<{id: string, author: string}|null>} Changeset info or null
 */
async function extractChangesetInfoAtCursor(content, cursorPosition, filePath) {
  const extractor = getExtractorForFile(filePath);
  return extractor.extractChangesetInfoAtCursor(content, cursorPosition);
}

/**
 * Parse all changesets from the file
 * @param {string} content File content (XML or YAML)
 * @param {string} filePath Path to the file
 * @returns {Promise<Array<{id: string, author: string, label: string}>>} List of all changesets
 */
async function getAllChangesets(content, filePath) {
  const extractor = getExtractorForFile(filePath);
  return extractor.getAllChangesets(content);
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
  const extractor = getExtractorForFile(filePath);
  return extractor.findChangeset(content, id, author);
}

module.exports = {
  getExtractorForFile,
  getExtractorForFormat,
  getFileFormat,
  isYamlFile,
  extractChangesetInfoAtCursor,
  getAllChangesets,
  findChangeset
};