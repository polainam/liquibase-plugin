const vscode = require('vscode');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os'); 

async function getLiquibasePropertiesPath() {
  // Try to get the path from settings
  const config = vscode.workspace.getConfiguration('liquibaseGenerator');
  let propertiesPath = config.get('propertiesPath');
  
  // If not set or file doesn't exist, prompt the user
  if (!propertiesPath || !fs.existsSync(propertiesPath)) {
    const result = await vscode.window.showInformationMessage(
      'Path to liquibase.properties is not set or invalid. Would you like to set it now?',
      'Yes', 'No'
    );
    
    if (result !== 'Yes') {
      return null;
    }
    
    // Open a file dialog to select the properties file
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        'Properties Files': ['properties']
      },
      title: 'Select liquibase.properties file'
    });
    
    if (!fileUris || fileUris.length === 0) {
      return null;
    }
    
    propertiesPath = fileUris[0].fsPath;
    
    // Save the path to settings
    await config.update('propertiesPath', propertiesPath, true);
  }
  
  return propertiesPath;
}

async function extractChangesetInfoAtCursor(text, cursorPosition) {
  const changesetOpenRegex = /<changeSet[^>]*>/gi;
  const changesetCloseRegex = /<\/changeSet>/gi;

  const opens = [...text.matchAll(changesetOpenRegex)];
  const closes = [...text.matchAll(changesetCloseRegex)];

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
  let cursorInChangeset = null;
  
  // First try to get changeset at cursor position
  try {
    const cursorPosition = editor.document.offsetAt(editor.selection.active);
    cursorInChangeset = await extractChangesetInfoAtCursor(text, cursorPosition);
  } catch (err) {
    console.error('Error extracting changeset at cursor:', err);
  }
  
  // If no changeset found at cursor, show a quick pick menu
  if (contextual && cursorInChangeset) {
      changesetInfo = cursorInChangeset;
      const proceed = await vscode.window.showInformationMessage(
        `Generate SQL for changeset ID: ${changesetInfo.id} by ${changesetInfo.author}?`,
        'Yes', 'No'
      );
      
      if (proceed !== 'Yes') return;
  } else {
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

        // Используем системную временную директорию
        const tempFileName = `liquibase_temp_${Date.now()}.xml`;
        const tempFilePath = path.join(os.tmpdir(), tempFileName);
        fs.writeFileSync(tempFilePath, tempXml);

        // Используем путь к liquibase.properties в команде
        const liquibaseCmd = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${os.tmpdir()},${workspaceFolder}" updateSql`;
        
        return new Promise((resolve, reject) => {
          cp.exec(liquibaseCmd, { cwd: workspaceFolder }, (err, stdout, stderr) => {
            // Всегда очищаем временный файл
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

            try {
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

module.exports = {
  generateSqlForChangeset,
  getLiquibasePropertiesPath
};
