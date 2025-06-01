const vscode = require('vscode');

function setCursorToOptimalPosition(editor) {
    try {
        const cursorLineNum = findLineContaining(editor.document, 'CURSOR_POSITION');

        if (cursorLineNum >= 0) {
            const line = editor.document.lineAt(cursorLineNum);
            const lineText = line.text;

            const markerIndex = lineText.indexOf('CURSOR_POSITION');

            const newPosition = new vscode.Position(cursorLineNum, markerIndex);

            editor.edit(editBuilder => {
                const markerRange = new vscode.Range(cursorLineNum, markerIndex, cursorLineNum, markerIndex + 'CURSOR_POSITION'.length);
                editBuilder.delete(markerRange);
            }).then(() => {
                editor.selection = new vscode.Selection(newPosition, newPosition);
                editor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.InCenter);
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

async function promptForVariable(variable, namingPattern, currentVars) {
    return new Promise(resolve => {
        const inputBox = vscode.window.createInputBox();
        const capitalizedVar = variable.charAt(0).toUpperCase() + variable.slice(1);

        inputBox.title = `${capitalizedVar}`;
        inputBox.prompt = `Enter ${variable}`;

        inputBox.onDidChangeValue(value => {
            if (value) {
                const previewVars = { ...currentVars, [variable]: value };
                const filename = require('./fileOperations').formatFilename(namingPattern, previewVars);
                inputBox.title = `${capitalizedVar} - Preview: ${filename}`;
            } else {
                inputBox.title = `${capitalizedVar}`;
            }
        });

        inputBox.onDidAccept(() => {
            inputBox.hide();
            resolve(inputBox.value);
        });

        inputBox.onDidHide(() => {
            resolve(inputBox.value);
        });

        inputBox.show();
    });
}

module.exports = {
    setCursorToOptimalPosition,
    findLineContaining,
    openFilesInSplitView,
    promptForVariable
}; 