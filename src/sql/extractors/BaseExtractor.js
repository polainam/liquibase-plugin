class BaseExtractor {
  splitLines(content) {
    return content.split(/\r?\n/);
  }

  getLineNumberFromPosition(content, position) {
    const lines = this.splitLines(content);
    let currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 для символа новой строки
      if (currentPos > position) {
        return i;
      }
    }
    return lines.length - 1;
  }

  /**
   * @param {string} content
   * @param {number} cursorPosition
   * @returns {Promise<Object|null>}
   */
  async extractChangesetInfoAtCursor(content, cursorPosition) {
    throw new Error('Must be implemented');
  }

  /**
   * @param {string} content
   * @returns {Promise<Array<Object>>}
   */
  async getAllChangesets(content) {
    throw new Error('Must be implemented');
  }

  /**
   * @param {string} content
   * @param {string} id
   * @param {string} author
   * @returns {Promise<Object|null>}
   */
  async findChangeset(content, id, author) {
    throw new Error('Must be implemented');
  }
}

module.exports = BaseExtractor;
