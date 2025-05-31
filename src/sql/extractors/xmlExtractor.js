const vscode = require('vscode');
const xml2js = require('xml2js');
const BaseExtractor = require('./BaseExtractor');

class XmlExtractor extends BaseExtractor {

  async extractChangesetInfoAtCursor(content, cursorPosition) {
    const changesetOpenRegex = /<changeSet[^>]*>/gi;
    const changesetCloseRegex = /<\/changeSet>/gi;

    const opens = [...content.matchAll(changesetOpenRegex)];
    const closes = [...content.matchAll(changesetCloseRegex)];

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

  async getAllChangesets(content) {
    try {
      const parsed = await xml2js.parseStringPromise(content);
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

  async findChangeset(content, id, author) {
    try {
      const parsed = await xml2js.parseStringPromise(content);
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

  extractDocumentBoundaries(content) {
    const xmlDeclarationMatch = content.match(/<\?xml[^>]*\?>/i);
    const xmlDeclaration = xmlDeclarationMatch ? xmlDeclarationMatch[0] : '<?xml version="1.0" encoding="UTF-8"?>';

    const headerMatch = content.match(/<databaseChangeLog[^>]*>/i);
    const footerMatch = content.match(/<\/databaseChangeLog>/i);

    if (!headerMatch || !footerMatch) {
      throw new Error('Не удалось найти <databaseChangeLog> или </databaseChangeLog> в файле.');
    }

    return {
      xmlDeclaration,
      header: headerMatch[0],
      footer: footerMatch[0]
    };
  }
}

module.exports = XmlExtractor;
