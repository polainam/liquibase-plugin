const vscode = require('vscode');
const yaml = require('js-yaml');
const BaseExtractor = require('./BaseExtractor');

class YamlExtractor extends BaseExtractor {

  async extractChangesetInfoAtCursor(content, cursorPosition) {
    try {
      const lines = content.split('\n');
      let charCount = 0;
      let lineNum = 0;

      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1; // +1 for newline
        if (charCount > cursorPosition) {
          lineNum = i;
          break;
        }
      }

      const parsedYaml = yaml.load(content);
      if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
        return null;
      }

      const changeLogItems = parsedYaml.databaseChangeLog;
      if (!Array.isArray(changeLogItems)) {
        return null;
      }

      for (const changeSet of changeLogItems) {
        if (!changeSet.changeSet) continue;

        const changeSetStart = this.findChangesetStartLine(content, changeSet.changeSet.id, changeSet.changeSet.author);
        const changeSetEnd = this.findChangesetEndLine(content, changeSetStart);

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

  findChangesetStartLine(content, id, author) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().match(/^\s*-\s*changeSet\s*:/)) {
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

  findChangesetEndLine(content, startLine) {
    const lines = content.split('\n');
    const startIndent = this.getIndentation(lines[startLine]);

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;

      const indent = this.getIndentation(lines[i]);
      if (indent <= startIndent && line.match(/^\s*-/)) {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  async getAllChangesets(content) {
    try {
      const parsedYaml = yaml.load(content);
      if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
        return [];
      }

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

  async findChangeset(content, id, author) {
    try {
      const parsedYaml = yaml.load(content);
      if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
        return null;
      }

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
}

module.exports = YamlExtractor;
