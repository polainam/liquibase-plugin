// Functions for finding and extracting changeset info from JSON

const vscode = require('vscode');

/**
 * Extracts changeset information at cursor position in JSON
 * @param {string} jsonContent The JSON content
 * @param {number} cursorPosition The cursor position in the document
 * @returns {Promise<{id: string, author: string}|null>} Changeset info or null
 */
async function extractChangesetInfoAtCursor(jsonContent, cursorPosition) {
  try {
    // Convert position to line number
    const lines = jsonContent.split('\n');
    let charCount = 0;
    let lineNum = 0;
    
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline character
      if (charCount > cursorPosition) {
        lineNum = i;
        break;
      }
    }
    
    // Parse the JSON
    const parsedJson = JSON.parse(jsonContent);
    if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
      return null;
    }
    
    // Ensure databaseChangeLog is an array
    const changeLogItems = parsedJson.databaseChangeLog;
    if (!Array.isArray(changeLogItems)) {
      return null;
    }
    
    // Find which changeset the cursor is in
    for (const changeLogItem of changeLogItems) {
      if (!changeLogItem.changeSet) continue;
      
      // Find the starting line of this changeset
      const changeSetStart = findChangesetStartLine(jsonContent, changeLogItem.changeSet.id, changeLogItem.changeSet.author);
      const changeSetEnd = findChangesetEndLine(jsonContent, changeSetStart);
      
      if (changeSetStart <= lineNum && lineNum <= changeSetEnd) {
        return {
          id: changeLogItem.changeSet.id,
          author: changeLogItem.changeSet.author
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting JSON changeset info:', error);
    return null;
  }
}

/**
 * Find the starting line of a changeset in JSON
 * @param {string} jsonContent JSON content
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @returns {number} Line number
 */
function findChangesetStartLine(jsonContent, id, author) {
  const lines = jsonContent.split('\n');
  
  // Look for a pattern like "changeSet": { followed by id and author
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^\s*"changeSet"\s*:\s*\{/)) {
      // Check next few lines for id and author
      let idFound = false;
      let authorFound = false;
      
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes(`"id": "${id}"`) || lines[j].includes(`"id":"${id}"`)) {
          idFound = true;
        }
        if (lines[j].includes(`"author": "${author}"`) || lines[j].includes(`"author":"${author}"`)) {
          authorFound = true;
        }
        if (idFound && authorFound) {
          return i;
        }
      }
    }
  }
  
  return 0;
}

/**
 * Find the ending line of a changeset in JSON
 * @param {string} jsonContent JSON content
 * @param {number} startLine Starting line of the changeset
 * @returns {number} Line number
 */
function findChangesetEndLine(jsonContent, startLine) {
  const lines = jsonContent.split('\n');
  let braceCount = 0;
  let inChangeset = false;
  
  // Count opening and closing braces to determine where changeset ends
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('"changeSet"') && line.includes('{')) {
      inChangeset = true;
    }
    
    if (inChangeset) {
      // Count opening braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        // When we reach 0, we've found the end of the changeset object
        if (braceCount === 0 && i > startLine) {
          return i;
        }
      }
    }
  }
  
  return lines.length - 1;
}

/**
 * Parse all changesets from the JSON file
 * @param {string} jsonContent JSON content
 * @returns {Promise<Array<{id: string, author: string, label: string}>>} List of all changesets
 */
async function getAllChangesets(jsonContent) {
  try {
    const parsedJson = JSON.parse(jsonContent);
    if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
      return [];
    }
    
    // Ensure databaseChangeLog is an array
    const changeLogItems = parsedJson.databaseChangeLog;
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
    vscode.window.showErrorMessage(`Failed to parse JSON changelog: ${error.message}`);
    return [];
  }
}

/**
 * Finds a specific changeset in the JSON content
 * @param {string} jsonContent The JSON content
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @returns {Promise<any|null>} The changeset object or null
 */
async function findChangeset(jsonContent, id, author) {
  try {
    const parsedJson = JSON.parse(jsonContent);
    if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
      return null;
    }
    
    // Ensure databaseChangeLog is an array
    const changeLogItems = parsedJson.databaseChangeLog;
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
    vscode.window.showErrorMessage(`Error parsing JSON changelog: ${error.message}`);
    return null;
  }
}

module.exports = {
  extractChangesetInfoAtCursor,
  getAllChangesets,
  findChangeset
}; 