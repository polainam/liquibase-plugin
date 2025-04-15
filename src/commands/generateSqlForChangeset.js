const vscode = require('vscode');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function generateSqlForChangeset() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Откройте changelog файл с changeset.');
    return;
  }

  const text = editor.document.getText();
  const filePath = editor.document.uri.fsPath;
  const workspaceFolder = path.dirname(filePath);

  const id = await vscode.window.showInputBox({ prompt: 'Введите ID changeset' });
  const author = await vscode.window.showInputBox({ prompt: 'Введите автора changeset' });

  if (!id || !author) {
    vscode.window.showWarningMessage('ID и Author обязательны.');
    return;
  }

  try {
    const parsed = await xml2js.parseStringPromise(text);
    const changeSets = parsed.databaseChangeLog.changeSet;

    const match = changeSets.find(cs => cs.$.id === id && cs.$.author === author);
    if (!match) {
      vscode.window.showErrorMessage(`Changeset с id=${id} и author=${author} не найден.`);
      return;
    }

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

    const liquibaseCmd = `liquibase --changeLogFile="${tempFileName}" --searchPath="${workspaceFolder}" updateSql`;
    
    cp.exec(liquibaseCmd, { cwd: workspaceFolder }, (err, stdout, stderr) => {
      fs.unlink(tempFilePath, () => {});

      if (err) {
        vscode.window.showErrorMessage(`Ошибка Liquibase: ${stderr}`);
        return;
      }

      vscode.workspace.openTextDocument({ content: stdout, language: 'sql' })
        .then(document => vscode.window.showTextDocument(document));
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Ошибка при парсинге changelog: ${error.message}`);
  }
}

module.exports = {
  generateSqlForChangeset
};