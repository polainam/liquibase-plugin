const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const os = require('os');

function formatFilename(pattern, variables) {
    let result = pattern;
    
    if (pattern.includes('{date}')) {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        const dateFormat = config.get('dateFormatInFilenames') || 'YYYYMMDD';
        result = result.replace('{date}', moment().format(dateFormat));
    }
    
    for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, value);
        }
    }
    
    return result;
}

function getRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    return path.relative(fromDir, toFile).replace(/\\/g, '/');
}

function setCursorToOptimalPosition(editor) {
    try {
        const cursorLineNum = findLineContaining(editor.document, 'CURSOR_POSITION');
        
        if (cursorLineNum >= 0) {
            const line = editor.document.lineAt(cursorLineNum);
            const lineText = line.text;
            
            const markerIndex = lineText.indexOf('CURSOR_POSITION');
            
            const newPosition = new vscode.Position(
                cursorLineNum,
                markerIndex
            );
            
            editor.edit(editBuilder => {
                const markerRange = new vscode.Range(
                    cursorLineNum,
                    markerIndex,
                    cursorLineNum,
                    markerIndex + 'CURSOR_POSITION'.length
                );
                editBuilder.delete(markerRange);
            }).then(() => {
                editor.selection = new vscode.Selection(newPosition, newPosition);
                
                editor.revealRange(
                    new vscode.Range(newPosition, newPosition),
                    vscode.TextEditorRevealType.InCenter
                );
            });
        }
    } catch (error) {
        console.error('Error setting cursor position:', error);
    }
}

function findLineContaining(document, searchString) {
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.text.includes(searchString)) {
            return i;
        }
    }
    return -1;
}

async function openFilesInSplitView(file1, file2) {
    try {
        const doc1 = await vscode.workspace.openTextDocument(file1);
        await vscode.window.showTextDocument(doc1, { preview: false });
        
        const doc2 = await vscode.workspace.openTextDocument(file2);
        const editor = await vscode.window.showTextDocument(doc2, { 
            viewColumn: vscode.window.activeTextEditor?.viewColumn,
            preview: false
        });

        if (editor) {
            setCursorToOptimalPosition(editor);
        }
    } catch (error) {
        console.error('Error opening files as tabs:', error);
        const doc = await vscode.workspace.openTextDocument(file2);
        await vscode.window.showTextDocument(doc);
    }
}

function createTempFile(content, prefix = 'temp', extension = '.xml') {
    const tempFileName = `${prefix}_${Date.now()}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    if (extension.toLowerCase() === '.xml' && !content.trim().startsWith('<?xml')) {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n' + content;
    }
    
    fs.writeFileSync(tempFilePath, content);
    return tempFilePath;
  }

function deleteFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err);
  }
}

function isYamlFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.yaml' || ext === '.yml';
}

module.exports = {
    formatFilename,
    getRelativePath,
    setCursorToOptimalPosition,
    openFilesInSplitView,
    createTempFile,
    deleteFileIfExists,
    isYamlFile,
}; 