const vscode = require('vscode');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

/**
 * Extract changeset information from XML at the current cursor position
 * @param {string} text XML content
 * @param {number} cursorPosition Current cursor position
 * @returns {Promise<{id: string, author: string} | null>} Changeset info or null if not found
 */
async function extractChangesetInfoAtCursor(text, cursorPosition) {
  // Simple approach - look for changeset tags around cursor position
  const beforeCursor = text.substring(0, cursorPosition);
  const afterCursor = text.substring(cursorPosition);
  
  // Find the closest changeset start tag before cursor
  const changesetStartRegex = /<changeSet[^>]*>/gi;
  const changesetStarts = [...beforeCursor.matchAll(changesetStartRegex)];
  if (!changesetStarts.length) return null;
  
  const lastChangesetStart = changesetStarts[changesetStarts.length - 1];
  const changesetTagContent = lastChangesetStart[0];
  
  // Extract id and author from the tag
  const idMatch = changesetTagContent.match(/id=["']([^"']*)["']/i);
  const authorMatch = changesetTagContent.match(/author=["']([^"']*)["']/i);
  
  if (!idMatch || !authorMatch) return null;
  
  return {
    id: idMatch[1],
    author: authorMatch[1]
  };
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
 * Generate SQL for a specific changeset
 */
async function generateSqlForChangeset() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Please open a changelog file with changesets');
    return;
  }

  const text = editor.document.getText();
  const filePath = editor.document.uri.fsPath;
  const workspaceFolder = path.dirname(filePath);
  
  let changesetInfo = null;
  
  // First try to get changeset at cursor position
  try {
    const cursorPosition = editor.document.offsetAt(editor.selection.active);
    changesetInfo = await extractChangesetInfoAtCursor(text, cursorPosition);
  } catch (err) {
    console.error('Error extracting changeset at cursor:', err);
  }
  
  // If no changeset found at cursor, show a quick pick menu
  if (!changesetInfo) {
    const changesets = await getAllChangesets(text);
    if (changesets.length === 0) {
      vscode.window.showErrorMessage('No changesets found in the current file');
      return;
    }
    
    const selected = await vscode.window.showQuickPick(
      changesets,
      { placeHolder: 'Select changeset to generate SQL for' }
    );
    
    if (!selected) return; // User cancelled
    changesetInfo = { id: selected.id, author: selected.author };
  } else {
    // Confirm with the user if we found a changeset at cursor
    const proceed = await vscode.window.showInformationMessage(
      `Generate SQL for changeset ID: ${changesetInfo.id} by ${changesetInfo.author}?`,
      'Yes', 'No'
    );
    
    if (proceed !== 'Yes') return;
  }
  
  try {
    const parsed = await xml2js.parseStringPromise(text);
    const changeSets = parsed.databaseChangeLog.changeSet;

    const match = changeSets.find(cs => 
      cs.$.id === changesetInfo.id && cs.$.author === changesetInfo.author
    );
    
    if (!match) {
      vscode.window.showErrorMessage(`Changeset with id=${changesetInfo.id} and author=${changesetInfo.author} not found.`);
      return;
    }

    // Show progress indicator
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Generating SQL for changeset ${changesetInfo.id}...`,
      cancellable: false
    }, async (progress) => {
      try {
        const builder = new xml2js.Builder();
        const tempChangeLog = {
          databaseChangeLog: {
            $: parsed.databaseChangeLog.$ || {},
            changeSet: [match]
          }
        };

        const tempXml = builder.buildObject(tempChangeLog);

        const tempFileName = `liquibase_temp_${Date.now()}.xml`;
        const tempFilePath = path.join(workspaceFolder, tempFileName);
        fs.writeFileSync(tempFilePath, tempXml);

        // Execute liquibase command
        return new Promise((resolve, reject) => {
          const liquibaseCmd = `liquibase --changeLogFile="${tempFileName}" --searchPath="${workspaceFolder}" updateSql`;
          
          cp.exec(liquibaseCmd, { cwd: workspaceFolder }, (err, stdout, stderr) => {
            // Always clean up the temp file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (unlinkErr) {
              console.error('Failed to delete temp file:', unlinkErr);
            }

            if (err) {
              vscode.window.showErrorMessage(`Liquibase error: ${stderr}`);
              reject(err);
              return;
            }

            // FIXED: Use try-catch with async/await instead of promise chains
            try {
              // Instead of chaining promises, use a more straightforward approach
              vscode.workspace.openTextDocument({ content: stdout, language: 'sql' })
                .then(document => {
                  vscode.window.showTextDocument(document)
                    .then(() => {
                      resolve();
                    }, error => {
                      reject(error);
                    });
                }, error => {
                  reject(error);
                });
            } catch (error) {
              reject(error);
            }
          });
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Error generating SQL: ${error.message}`);
        throw error;
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error parsing changelog: ${error.message}`);
  }
}

/**
 * Generate SQL for a specific changeset from context menu
 */
async function generateSqlForChangesetContextMenu(uri) {
  // Read the file content
  try {
    const fileContent = fs.readFileSync(uri.fsPath, 'utf8');
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    
    // Use the existing function with the new context
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await generateSqlForChangeset();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error opening file: ${error.message}`);
  }
}

module.exports = {
  generateSqlForChangeset,
  generateSqlForChangesetContextMenu
};