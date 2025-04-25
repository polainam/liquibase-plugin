const vscode = require('vscode');
const xml2js = require('xml2js');
const cp = require('child_process');
const path = require('path');

const { getLiquibasePropertiesPath } = require('./configManager');
const { extractChangesetInfoAtCursor, getAllChangesets, findChangeset } = require('./changesetExtractor');
const { extractChangesetSql } = require('./sqlProcessor');
const { createTempFile, deleteFileIfExists } = require('./utils');

/**
 * Generate SQL for a specific changeset
 * @param {boolean} contextual Whether to use cursor position to find changeset
 */
async function generateSqlForChangeset(contextual = false) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Please open a changelog file with changesets');
    return;
  }

  // Get the liquibase.properties path first
  const propertiesPath = await getLiquibasePropertiesPath();
  if (!propertiesPath) {
    vscode.window.showErrorMessage('Cannot proceed without liquibase.properties');
    return;
  }

  const text = editor.document.getText();
  const filePath = editor.document.uri.fsPath;
  const workspaceFolder = path.dirname(filePath);
  
  let changesetInfo = null;
  
  // Try to get changeset at cursor position if contextual is true
  if (contextual) {
    try {
      const cursorPosition = editor.document.offsetAt(editor.selection.active);
      const cursorInChangeset = await extractChangesetInfoAtCursor(text, cursorPosition);
      
      if (cursorInChangeset) {
        changesetInfo = cursorInChangeset;
        
        // Ask user which SQL version they want to generate
        const sqlType = await vscode.window.showQuickPick(
          [
            { label: 'Full SQL', description: 'Generate complete SQL including all Liquibase operations' },
            { label: 'Short SQL', description: 'Generate only the SQL specific to this changeset' }
          ],
          { 
            placeHolder: `Select SQL type for changeset ID: ${changesetInfo.id} by ${changesetInfo.author}`
          }
        );
        
        if (!sqlType) return; // User cancelled
        
        const isFullSql = sqlType.label === 'Full SQL';
        
        await processChangeset(text, workspaceFolder, propertiesPath, changesetInfo, isFullSql);
        return;
      }
    } catch (err) {
      console.error('Error extracting changeset at cursor:', err);
    }
  }
  
  // If contextual is false or no changeset was found at cursor, show a picker
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
  
  // Ask user which SQL version they want to generate
  const sqlType = await vscode.window.showQuickPick(
    [
      { label: 'Full SQL', description: 'Generate complete SQL including all Liquibase operations' },
      { label: 'Changeset SQL Only', description: 'Generate only the SQL specific to this changeset' }
    ],
    { 
      placeHolder: `Select SQL type for changeset ID: ${changesetInfo.id} by ${changesetInfo.author}`
    }
  );
  
  if (!sqlType) return; // User cancelled
  
  const isFullSql = sqlType.label === 'Full SQL';
  
  await processChangeset(text, workspaceFolder, propertiesPath, changesetInfo, isFullSql);
}

/**
 * Process a changeset and generate SQL
 * @param {string} xmlContent XML content
 * @param {string} workspaceFolder Workspace folder path
 * @param {string} propertiesPath Path to liquibase.properties
 * @param {Object} changesetInfo Changeset information
 * @param {boolean} isFullSql Whether to show full SQL or just changeset SQL
 */
async function processChangeset(xmlContent, workspaceFolder, propertiesPath, changesetInfo, isFullSql) {
    try {
      // Parse the original XML to get all namespaces
      const parsed = await xml2js.parseStringPromise(xmlContent);
      
      if (!parsed.databaseChangeLog) {
        vscode.window.showErrorMessage("Invalid changelog format: missing databaseChangeLog element");
        return;
      }
      
      // Find the changeset
      const changeSets = parsed.databaseChangeLog.changeSet || [];
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
        title: `Generating ${isFullSql ? 'full' : 'changeset'} SQL for changeset ${changesetInfo.id}...`,
        cancellable: false
      }, async (progress) => {
        try {
          // Get all namespace attributes from the original databaseChangeLog
          const namespaces = {
            ...parsed.databaseChangeLog.$
          };
          
          const builder = new xml2js.Builder();
          const tempChangeLog = {
            databaseChangeLog: {
              $: namespaces,
              changeSet: [match]
            }
          };
  
          const tempXml = builder.buildObject(tempChangeLog);
  
          // Create temp file
          const tempFilePath = createTempFile(tempXml, 'liquibase_temp', '.xml');
          const tempFileName = path.basename(tempFilePath);
  
          try {
            // Prepare the liquibase command
            const liquibaseCmd = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${path.dirname(tempFilePath)},${workspaceFolder}" updateSql`;
            
            return new Promise((resolve, reject) => {
              cp.exec(liquibaseCmd, { cwd: workspaceFolder }, (err, stdout, stderr) => {
                // Always clean up the temp file
                deleteFileIfExists(tempFilePath);
  
                if (err) {
                  vscode.window.showErrorMessage(`Liquibase error: ${stderr}`);
                  reject(err);
                  return;
                }
  
                try {
                  // Process the SQL output based on user choice
                  let sqlOutput = stdout;
                  if (!isFullSql) {
                    sqlOutput = extractChangesetSql(stdout, changesetInfo.id, changesetInfo.author);
                  }
                  
                  vscode.workspace.openTextDocument({ content: sqlOutput, language: 'sql' })
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
            // Clean up in case of error
            deleteFileIfExists(tempFilePath);
            throw error;
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Error generating SQL: ${error.message}`);
          throw error;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Error processing changeset: ${error.message}`);
    }
  }

module.exports = {
  generateSqlForChangeset
};
