// Functions for finding and extracting changeset info from YAML

const vscode = require('vscode');
const yaml = require('js-yaml');

/**
 * Extracts changeset information at cursor position in YAML
 * @param {string} yamlContent The YAML content
 * @param {number} cursorPosition The cursor position in the document
 * @returns {Promise<{id: string, author: string}|null>} Changeset info or null
 */
async function extractChangesetInfoAtCursor(yamlContent, cursorPosition) {
  try {
    // Convert position to line number
    const lines = yamlContent.split('\n');
    let charCount = 0;
    let lineNum = 0;
    
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline character
      if (charCount > cursorPosition) {
        lineNum = i;
        break;
      }
    }
    
    // Parse the YAML
    const parsedYaml = yaml.load(yamlContent);
    if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
      return null;
    }
    
    // Проверяем, что databaseChangeLog это массив
    const changeLogItems = parsedYaml.databaseChangeLog;
    if (!Array.isArray(changeLogItems)) {
      return null;
    }
    
    // Find which changeset the cursor is in
    for (const changeSet of changeLogItems) {
      if (!changeSet.changeSet) continue;
      
      // Find the starting line of this changeset
      const changeSetStart = findChangesetStartLine(yamlContent, changeSet.changeSet.id, changeSet.changeSet.author);
      const changeSetEnd = findChangesetEndLine(yamlContent, changeSetStart);
      
      if (changeSetStart <= lineNum && lineNum <= changeSetEnd) {
        return {
          id: changeSet.changeSet.id,
          author: changeSet.changeSet.author
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting changeset info:', error);
    return null;
  }
}

/**
 * Find the starting line of a changeset
 * @param {string} yamlContent YAML content
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @returns {number} Line number
 */
function findChangesetStartLine(yamlContent, id, author) {
  const lines = yamlContent.split('\n');
  
  // Look for a pattern like "- changeSet:" followed by id and author
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^\s*-\s*changeSet\s*:/)) {
      // Check next few lines for id and author
      let found = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes(`id: ${id}`) && found) {
          return i;
        }
        if (lines[j].includes(`author: ${author}`)) {
          found = true;
        }
      }
    }
  }
  return 0;
}

/**
 * Find the ending line of a changeset
 * @param {string} yamlContent YAML content
 * @param {number} startLine Starting line of the changeset
 * @returns {number} Line number
 */
function findChangesetEndLine(yamlContent, startLine) {
  const lines = yamlContent.split('\n');
  const startIndent = getIndentation(lines[startLine]);
  
  // Find next line with same or less indentation
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip empty lines
    if (line === '') continue;
    
    const indent = getIndentation(lines[i]);
    if (indent <= startIndent && line.match(/^\s*-/)) {
      return i - 1;
    }
  }
  
  return lines.length - 1;
}

/**
 * Get indentation level of a line
 * @param {string} line Text line
 * @returns {number} Indentation level
 */
function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Parse all changesets from the YAML file
 * @param {string} yamlContent YAML content
 * @returns {Promise<Array<{id: string, author: string, label: string}>>} List of all changesets
 */
async function getAllChangesets(yamlContent) {
  try {
    const parsedYaml = yaml.load(yamlContent);
    if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
      return [];
    }
    
    // Проверяем, что databaseChangeLog это массив
    const changeLogItems = parsedYaml.databaseChangeLog;
    if (!Array.isArray(changeLogItems)) {
      return [];
    }
    
    const changeSets = [];
    for (const item of changeLogItems) {
      if (item.changeSet) {
        changeSets.push({
          id: item.changeSet.id,
          author: item.changeSet.author,
          label: `${item.changeSet.id} (by ${item.changeSet.author})`
        });
      }
    }
    
    return changeSets;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to parse YAML changelog: ${error.message}`);
    return [];
  }
}

/**
 * Finds a specific changeset in the YAML content
 * @param {string} yamlContent The YAML content
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @returns {Promise<any|null>} The changeset object or null
 */
async function findChangeset(yamlContent, id, author) {
  try {
    const parsedYaml = yaml.load(yamlContent);
    if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
      return null;
    }
    
    // Проверяем, что databaseChangeLog это массив
    const changeLogItems = parsedYaml.databaseChangeLog;
    if (!Array.isArray(changeLogItems)) {
      return null;
    }
    
    for (const item of changeLogItems) {
      if (item.changeSet && item.changeSet.id === id && item.changeSet.author === author) {
        return item.changeSet;
      }
    }
    
    return null;
  } catch (error) {
    vscode.window.showErrorMessage(`Error parsing YAML changelog: ${error.message}`);
    return null;
  }
}

module.exports = {
  extractChangesetInfoAtCursor,
  getAllChangesets,
  findChangeset
}; 