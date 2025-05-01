/**
 * Base class for changeset extractors
 */
class BaseExtractor {
    /**
     * Extracts changeset info at cursor position
     */
    async extractChangesetInfoAtCursor(content, cursorPosition) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Gets all changesets from the file
     */
    async getAllChangesets(content) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Finds a specific changeset
     */
    async findChangeset(content, id, author) {
      throw new Error('Method not implemented');
    }
  }
  
  module.exports = BaseExtractor;