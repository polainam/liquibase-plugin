const fs = require('fs');
const path = require('path');
const os = require('os');

function extractVariablesFromPattern(pattern) {
  const matches = pattern.match(/\{([^}]+)\}/g) || [];
  return matches.map(match => match.slice(1, -1));
}

function getUpdatedChangelogContent(format, parentContent, relativePath) {
  switch (format) {
      case 'xml':
          return parentContent.replace(
              /<\/databaseChangeLog>\s*$/,
              `    <include file="${relativePath}"/>\n</databaseChangeLog>\n`
          );

      case 'yaml':
      case 'yml':
          return parentContent + `\n  - include:\n      file: ${relativePath}\n`;

      case 'json': {
          const jsonObj = JSON.parse(parentContent);
          if (Array.isArray(jsonObj.databaseChangeLog)) {
              jsonObj.databaseChangeLog.push({ include: { file: relativePath } });
              return JSON.stringify(jsonObj, null, 2);
          } else {
              throw new Error('Invalid parent changelog JSON structure');
          }
      }

      default:
          throw new Error(`Unsupported format for parent changelog: ${format}`);
  }
}

module.exports = {
  extractVariablesFromPattern,
  getUpdatedChangelogContent
};