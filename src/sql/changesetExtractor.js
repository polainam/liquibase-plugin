// Functions for finding and extracting changeset info

const vscode = require('vscode');
const xml2js = require('xml2js');

/**
 * Extracts changeset information at cursor position
 * @param {string} text The XML content
 * @param {number} cursorPosition The cursor position in the document
 * @returns {Promise<{id: string, author: string}|null>} Changeset info or null
 */
async function extractChangesetInfoAtCursor(text, cursorPosition) {
  const changesetOpenRegex = /<changeSet[^>]*>/gi;
  const changesetCloseRegex = /<\/changeSet>/gi;

  const opens = [...text.matchAll(changesetOpenRegex)];
  const closes = [...text.matchAll(changesetCloseRegex)];

  if (opens.length !== closes.length) {
    console.warn('Mismatched <changeSet> and </changeSet> tags');
    return null;
  }

  for (let i = 0; i < opens.length; i++) {
    const open = opens[i];
    const close = closes[i];

    const start = open.index;
    const end = close.index + close[0].length;

    if (cursorPosition >= start && cursorPosition <= end) {
      const changesetTag = open[0];
      const idMatch = changesetTag.match(/id=["']([^"']*)["']/i);
      const authorMatch = changesetTag.match(/author=["']([^"']*)["']/i);

      if (!idMatch || !authorMatch) return null;

      return {
        id: idMatch[1],
        author: authorMatch[1]
      };
    }
  }

  return null;
}

/**
 * Parse all changesets from the XML file
 * @param {string} xmlContent XML content
 * @returns {Promise<Array<{id: string, author: string, label: string}>>} List of all changesets
 */
async function getAllChangesets(xmlContent) {
  try {
    const parsed = await xml2js.parseStringPromise(xmlContent);
    if (!parsed.databaseChangeLog || !parsed.databaseChangeLog.changeSet) {
      return [];
    }
    
    return parsed.databaseChangeLog.changeSet.map(cs => ({
      id: cs.$.id,
      author: cs.$.author,
      label: `${cs.$.id} (by ${cs.$.author})`
    }));
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to parse changelog: ${error.message}`);
    return [];
  }
}

/**
 * Finds a specific changeset in the XML content
 * @param {string} xmlContent The XML content
 * @param {string} id Changeset ID
 * @param {string} author Changeset author
 * @returns {Promise<any|null>} The changeset object or null
 */
async function findChangeset(xmlContent, id, author) {
  try {
    const parsed = await xml2js.parseStringPromise(xmlContent);
    if (!parsed.databaseChangeLog || !parsed.databaseChangeLog.changeSet) {
      return null;
    }
    
    const changeSets = parsed.databaseChangeLog.changeSet;
    return changeSets.find(cs => cs.$.id === id && cs.$.author === author) || null;
  } catch (error) {
    vscode.window.showErrorMessage(`Error parsing changelog: ${error.message}`);
    return null;
  }
}

module.exports = {
  extractChangesetInfoAtCursor,
  getAllChangesets,
  findChangeset
};
