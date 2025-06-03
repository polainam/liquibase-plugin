const sinon = require('sinon');

const vscode = {
    window: {
        showInformationMessage: sinon.stub(),
        showErrorMessage: sinon.stub(),
        showTextDocument: sinon.stub()
    },
    workspace: {
        openTextDocument: sinon.stub(),
        getConfiguration: sinon.stub()
    },
    Uri: {
        file: (path) => ({ fsPath: path, path }),
        parse: sinon.stub()
    },
    commands: {
        executeCommand: sinon.stub()
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
    }
};

module.exports = vscode; 