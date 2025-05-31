const vscode = require('vscode');

/**
 * @param {Array<{id: string, author: string, label?: string}>} changesets
 * @returns {Promise<{id: string, author: string, label?: string} | null>}
 */
async function promptSelectChangeset(changesets) {
  const picks = changesets.map(cs => ({
    label: cs.label || `${cs.id}`,
    description: `Author: ${cs.author}`,
    changeset: cs,
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select changeset to generate SQL for',
  });

  return selected ? selected.changeset : null;
}



async function promptSelectSqlType(changesetInfo) {
  return vscode.window.showQuickPick(
    [
      { label: 'Full SQL', description: 'Generate complete SQL including all Liquibase operations' },
      { label: 'Short SQL', description: 'Generate only the SQL specific to this changeset' }
    ],
    {
      placeHolder: `Select SQL type for changeset ID: ${changesetInfo.id} by ${changesetInfo.author}`
    }
  );
}

module.exports = {
  promptSelectChangeset,
  promptSelectSqlType
};
