const { generateSqlForChangeset } = require('./liquibaseRunner');
const extractors = require('./extractors');

module.exports = {
  generateSqlForChangeset,
  getExtractorForFile: extractors.getExtractorForFile
};