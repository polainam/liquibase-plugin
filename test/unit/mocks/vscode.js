const sinon = require('sinon');

// Создаем функцию для создания стаба с методом reset
function createStub() {
    const stub = sinon.stub();
    stub.reset = function() {
        this.resetHistory();
        this.resetBehavior();
        return this;
    };
    return stub;
}

const vscode = {
    window: {
        showInformationMessage: createStub(),
        showErrorMessage: createStub(),
        showTextDocument: createStub(),
        showQuickPick: createStub()
    },
    workspace: {
        openTextDocument: createStub(),
        getConfiguration: createStub()
    },
    Uri: {
        file: (path) => ({ fsPath: path, path }),
        parse: createStub()
    },
    commands: {
        executeCommand: createStub()
    },
    languages: {
        registerCompletionItemProvider: createStub()
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Range: class {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    Selection: class {
        constructor(anchor, active) {
            this.anchor = anchor;
            this.active = active;
        }
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ViewColumn: {
        Active: -1,
        Beside: -2
    },
    CompletionItemKind: {
        Text: 0,
        Method: 1,
        Function: 2,
        Constructor: 3,
        Field: 4,
        Variable: 5,
        Class: 6,
        Interface: 7,
        Module: 8,
        Property: 9,
        Unit: 10,
        Value: 11,
        Enum: 12,
        Keyword: 13,
        Snippet: 14,
        Color: 15,
        File: 16,
        Reference: 17,
        Folder: 18
    },
    CompletionItem: class {
        constructor(label) {
            this.label = label;
            this.kind = undefined;
            this.insertText = undefined;
            this.documentation = undefined;
            this.command = undefined;
        }
    },
    MarkdownString: class {
        constructor(value) {
            this.value = value;
        }
    },
    SnippetString: class {
        constructor(value) {
            this.value = value;
        }
    }
};

// Добавляем showOpenDialog, который отсутствовал
vscode.window.showOpenDialog = createStub();

module.exports = vscode; 