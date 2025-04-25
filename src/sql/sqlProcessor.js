// Functions for processing SQL output

/**
* Extract the actual changeset SQL from the full SQL output
 * @param {string} fullSql Full SQL output from liquibase
 * @param {string} changesetId ID of the changeset
 * @param {string} changesetAuthor Author of the changeset
 * @returns {string} Extracted changeset SQL
 */
function extractChangesetSql(fullSql, changesetId, changesetAuthor) {
  // Find the changeset comment line
  const changesetRegex = new RegExp(`-- Changeset.*::${changesetId}::${changesetAuthor}`, 'i');
  const lines = fullSql.split('\n');
  
  let result = [];
  let foundChangeset = false;
  let inChangeset = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If we find the changeset marker
    if (changesetRegex.test(line)) {
      foundChangeset = true;
      inChangeset = true;
      result.push(line);
      continue;
    }
    
    // If we're in a changeset and find the next insert into DATABASECHANGELOG or another marker,
    // it means we've reached the end of this changeset
    if (inChangeset && (
        line.trim().startsWith('INSERT INTO') && 
        line.includes('DATABASECHANGELOG') ||
        (line.trim().startsWith('-- ') && !result[result.length-1].trim().startsWith('-- ')) ||
        line.trim().startsWith('--*')
      )) {
      inChangeset = false;
    }
    
    // If we're inside a changeset, add the line
    if (inChangeset) {
      result.push(line);
    }
  }
  
  // If we couldn't find the changeset, return a message
  if (!foundChangeset) {
    return `No SQL found for changeset with id=${changesetId} and author=${changesetAuthor}`;
  }
  
  return result.join('\n');
}

module.exports = {
  extractChangesetSql
};
