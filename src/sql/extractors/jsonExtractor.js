const BaseExtractor = require('./BaseExtractor'); // путь к базовому классу, поправь по необходимости

class JsonExtractor extends BaseExtractor {
  /**
   * Находит начальную строку changeset по id и author
   * @param {string} content
   * @param {string} id
   * @param {string} author
   * @returns {number}
   */
  findChangesetStartLine(content, id, author) {
    const lines = this.splitLines(content);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().match(/^\s*"changeSet"\s*:\s*\{/)) {
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
   * Находит конечную строку changeset
   * @param {string} content
   * @param {number} startLine
   * @returns {number}
   */
  findChangesetEndLine(content, startLine) {
    const lines = this.splitLines(content);
    let braceCount = 0;
    let inChangeset = false;
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('"changeSet"') && line.includes('{')) {
        inChangeset = true;
      }
      if (inChangeset) {
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0 && i > startLine) {
            return i;
          }
        }
      }
    }
    return lines.length - 1;
  }

  async extractChangesetInfoAtCursor(content, cursorPosition) {
    try {
      const lineNum = this.getLineNumberFromPosition(content, cursorPosition);
      const parsedJson = JSON.parse(content);
      if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
        return null;
      }

      const changeLogItems = parsedJson.databaseChangeLog;
      if (!Array.isArray(changeLogItems)) {
        return null;
      }

      for (const changeLogItem of changeLogItems) {
        if (!changeLogItem.changeSet) continue;

        const start = this.findChangesetStartLine(content, changeLogItem.changeSet.id, changeLogItem.changeSet.author);
        const end = this.findChangesetEndLine(content, start);

        if (start <= lineNum && lineNum <= end) {
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

  async getAllChangesets(content) {
    try {
      const parsedJson = JSON.parse(content);
      if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
        return [];
      }
      const changeLogItems = parsedJson.databaseChangeLog;
      if (!Array.isArray(changeLogItems)) {
        return [];
      }

      return changeLogItems
        .filter(item => item.changeSet)
        .map(item => ({
          id: item.changeSet.id,
          author: item.changeSet.author,
          label: `${item.changeSet.id} (by ${item.changeSet.author})`
        }));
    } catch (error) {
      console.error('Failed to parse JSON changelog:', error);
      return [];
    }
  }

  async findChangeset(content, id, author) {
    try {
      const parsedJson = JSON.parse(content);
      if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
        return null;
      }
      const changeLogItems = parsedJson.databaseChangeLog;
      if (!Array.isArray(changeLogItems)) {
        return null;
      }

      const found = changeLogItems.find(
        item => item.changeSet && item.changeSet.id === id && item.changeSet.author === author
      );
      return found ? found.changeSet : null;
    } catch (error) {
      console.error('Error parsing JSON changelog:', error);
      return null;
    }
  }
}

module.exports = JsonExtractor;
