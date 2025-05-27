const vscode = require('vscode');
const xml2js = require('xml2js');
const yaml = require('js-yaml');
const cp = require('child_process');
const path = require('path');

const { extractChangesetInfoAtCursor, getAllChangesets, findChangeset, isYamlFile, isJsonFile } = require('./extractors');
const { extractChangesetSql } = require('./sqlProcessor');
const { getLiquibasePropertiesPath } = require('../utils/commonUtils');
const { createTempFile, deleteFileIfExists } = require('../utils/fileUtils');

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
  const isYaml = isYamlFile(filePath);
  const isJson = isJsonFile(filePath);
  
  let changesetInfo = null;
  
  // Try to get changeset at cursor position if contextual is true
  if (contextual) {
    try {
      const cursorPosition = editor.document.offsetAt(editor.selection.active);
      const cursorInChangeset = await extractChangesetInfoAtCursor(text, cursorPosition, filePath);
      
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
        
        await processChangeset(text, workspaceFolder, propertiesPath, changesetInfo, isFullSql, isYaml, isJson, filePath);
        return;
      }
    } catch (err) {
      console.error('Error extracting changeset at cursor:', err);
    }
  }
  
  // If contextual is false or no changeset was found at cursor, show a picker
  const changesets = await getAllChangesets(text, filePath);
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
  
  await processChangeset(text, workspaceFolder, propertiesPath, changesetInfo, isFullSql, isYaml, isJson, filePath);
}

/**
 * Process a changeset and generate SQL
 * @param {string} content File content
 * @param {string} workspaceFolder Workspace folder path
 * @param {string} propertiesPath Path to liquibase.properties
 * @param {Object} changesetInfo Changeset information
 * @param {boolean} isFullSql Whether to show full SQL or just changeset SQL
 * @param {boolean} isYaml Whether the file is YAML
 * @param {boolean} isJson Whether the file is JSON
 * @param {string} filePath Path to the original file
 */
async function processChangeset(content, workspaceFolder, propertiesPath, changesetInfo, isFullSql, isYaml, isJson, filePath) {
    try {
      // Show progress indicator
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Generating ${isFullSql ? 'full' : 'changeset'} SQL for changeset ${changesetInfo.id}...`,
        cancellable: false
      }, async (progress) => {
        try {
          // Create temporary changelog with only the target changeset
          let tempContent;
          let extension;
          
          if (isYaml) {
            // Handle YAML content
            const parsedYaml = yaml.load(content);
            if (!parsedYaml || typeof parsedYaml !== 'object' || !('databaseChangeLog' in parsedYaml)) {
              throw new Error("Invalid YAML changelog format: missing databaseChangeLog");
            }
            
            const changeLogItems = parsedYaml.databaseChangeLog;
            if (!Array.isArray(changeLogItems)) {
              throw new Error("Invalid YAML changelog format: databaseChangeLog is not an array");
            }
            
            // Find the changeset in YAML
            const changeset = await findChangeset(content, changesetInfo.id, changesetInfo.author, filePath);
            if (!changeset) {
              throw new Error(`Changeset with id=${changesetInfo.id} and author=${changesetInfo.author} not found.`);
            }
            
            // Create simplified YAML with only our changeset
            const tempYaml = {
              databaseChangeLog: [
                { changeSet: changeset }
              ]
            };
            
            tempContent = yaml.dump(tempYaml);
            extension = path.extname(filePath);
          } else if (isJson) {
            // Handle JSON content
            try {
              const parsedJson = JSON.parse(content);
              if (!parsedJson || typeof parsedJson !== 'object' || !('databaseChangeLog' in parsedJson)) {
                throw new Error("Invalid JSON changelog format: missing databaseChangeLog");
              }
              
              const changeLogItems = parsedJson.databaseChangeLog;
              if (!Array.isArray(changeLogItems)) {
                throw new Error("Invalid JSON changelog format: databaseChangeLog is not an array");
              }
              
              // Find the changeset in JSON
              const changeset = await findChangeset(content, changesetInfo.id, changesetInfo.author, filePath);
              if (!changeset) {
                throw new Error(`Changeset with id=${changesetInfo.id} and author=${changesetInfo.author} not found.`);
              }
              
              // Create simplified JSON with only our changeset
              const tempJson = {
                databaseChangeLog: [
                  { changeSet: changeset }
                ]
              };
              
              tempContent = JSON.stringify(tempJson, null, 2);
              extension = '.json';
            } catch (error) {
              throw new Error(`Failed to parse JSON: ${error.message}`);
            }
          } else {
            // Handle XML content
            const parsed = await xml2js.parseStringPromise(content);
            
            if (!parsed.databaseChangeLog) {
              throw new Error("Invalid changelog format: missing databaseChangeLog element");
            }
            
            // Find the changeset
            const changeSets = parsed.databaseChangeLog.changeSet || [];
            const match = changeSets.find(cs => 
              cs.$.id === changesetInfo.id && cs.$.author === changesetInfo.author
            );
            
            if (!match) {
              throw new Error(`Changeset with id=${changesetInfo.id} and author=${changesetInfo.author} not found.`);
            }
            
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

            tempContent = builder.buildObject(tempChangeLog);
            extension = '.xml';
          }
  
          // Create temp file
          const tempFilePath = createTempFile(tempContent, 'liquibase_temp', extension);
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
