const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Моки для зависимостей
const vscodeMock = {
    window: {
        showTextDocument: sinon.stub(),
        activeTextEditor: {
            viewColumn: 1
        },
        createInputBox: sinon.stub()
    },
    workspace: {
        openTextDocument: sinon.stub()
    },
    Position: class Position {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Range: class Range {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    Selection: class Selection {
        constructor(anchor, active) {
            this.anchor = anchor;
            this.active = active;
        }
    },
    TextEditorRevealType: {
        InCenter: 'InCenter'
    }
};

// Мок для редактора
const editorMock = {
    document: {
        lineCount: 10,
        lineAt: sinon.stub(),
        getText: sinon.stub()
    },
    edit: sinon.stub(),
    selection: null,
    revealRange: sinon.stub()
};

// Мок для InputBox
const inputBoxMock = {
    title: '',
    prompt: '',
    value: '',
    onDidChangeValue: sinon.stub(),
    onDidAccept: sinon.stub(),
    onDidHide: sinon.stub(),
    hide: sinon.stub(),
    show: sinon.stub()
};

// Загружаем модуль с моками
const editorView = proxyquire('../../../src/common/editorView', {
    'vscode': vscodeMock
});

describe('editorView', () => {
    let sandbox;
    let consoleErrorStub;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showTextDocument.reset();
        vscodeMock.workspace.openTextDocument.reset();
        editorMock.document.lineAt.reset();
        editorMock.edit.reset();
        editorMock.revealRange.reset();
        vscodeMock.window.createInputBox.reset();
        
        // Настраиваем стандартное поведение моков
        vscodeMock.workspace.openTextDocument.resolves({});
        vscodeMock.window.showTextDocument.resolves(editorMock);
        editorMock.edit.callsFake((callback) => {
            callback({
                delete: sinon.stub()
            });
            return Promise.resolve(true);
        });
        vscodeMock.window.createInputBox.returns(inputBoxMock);
        
        // Заменяем console.error на стаб
        consoleErrorStub = sandbox.stub(console, 'error');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('setCursorToOptimalPosition', () => {
        it('should not set cursor if marker not found', () => {
            // Стабы для поиска строки с маркером
            const findLineContainingStub = sandbox.stub(editorView, 'findLineContaining').returns(-1);
            
            // Вызываем функцию
            editorView.setCursorToOptimalPosition(editorMock);
            
            // Проверяем, что edit не был вызван
            assert.strictEqual(editorMock.edit.called, false);
            
            // Восстанавливаем стаб
            findLineContainingStub.restore();
        });
        
        it('should handle errors', () => {
            // Создаем конкретную ошибку для теста
            const error = new TypeError("Cannot read properties of undefined (reading 'text')");
            
            // Стабы для поиска строки с маркером
            const findLineContainingStub = sandbox.stub(editorView, 'findLineContaining').throws(error);
            
            // Вызываем функцию
            editorView.setCursorToOptimalPosition(editorMock);
            
            // Проверяем, что ошибка была залогирована
            assert.strictEqual(consoleErrorStub.calledOnce, true);
            assert.strictEqual(consoleErrorStub.firstCall.args[0], 'Error setting cursor position:');
            
            // Восстанавливаем стаб
            findLineContainingStub.restore();
        });
    });
    
    describe('findLineContaining', () => {
        it('should find line containing search string', () => {
            const document = {
                lineCount: 5,
                lineAt: (i) => {
                    const lines = [
                        { text: 'Line 1' },
                        { text: 'Line 2 with search' },
                        { text: 'Line 3' },
                        { text: 'Line 4' },
                        { text: 'Line 5' }
                    ];
                    return lines[i];
                }
            };
            
            const result = editorView.findLineContaining(document, 'search');
            
            assert.strictEqual(result, 1);
        });
        
        it('should return -1 if search string not found', () => {
            const document = {
                lineCount: 3,
                lineAt: (i) => {
                    const lines = [
                        { text: 'Line 1' },
                        { text: 'Line 2' },
                        { text: 'Line 3' }
                    ];
                    return lines[i];
                }
            };
            
            const result = editorView.findLineContaining(document, 'not found');
            
            assert.strictEqual(result, -1);
        });
    });
    
    describe('openFilesInSplitView', () => {
        it('should handle error and open single file', async () => {
            const file1 = '/path/to/file1.txt';
            const file2 = '/path/to/file2.txt';
            const doc2 = { uri: 'file2' };
            const error = new Error('Failed to open file');
            
            vscodeMock.workspace.openTextDocument.withArgs(file1).rejects(error);
            vscodeMock.workspace.openTextDocument.withArgs(file2).resolves(doc2);
            
            await editorView.openFilesInSplitView(file1, file2);
            
            assert.strictEqual(vscodeMock.workspace.openTextDocument.callCount, 2);
            assert.strictEqual(vscodeMock.window.showTextDocument.callCount, 1);
            assert.strictEqual(consoleErrorStub.calledOnce, true);
            assert.strictEqual(consoleErrorStub.firstCall.args[0], 'Error opening files as tabs:');
        });
    });
    
    describe('promptForVariable', () => {
        it('should prompt user for variable value', async () => {
            const variable = 'name';
            const pattern = 'file_{name}.txt';
            const currentVars = {};
            const userInput = 'test';
            
            // Настраиваем поведение inputBox
            inputBoxMock.onDidAccept.callsFake(callback => {
                inputBoxMock.value = userInput;
                callback();
            });
            
            const result = await editorView.promptForVariable(variable, pattern, currentVars);
            
            assert.strictEqual(result, userInput);
            assert.strictEqual(vscodeMock.window.createInputBox.calledOnce, true);
            assert.strictEqual(inputBoxMock.title, 'Name');
            assert.strictEqual(inputBoxMock.prompt, 'Enter name');
            assert.strictEqual(inputBoxMock.show.calledOnce, true);
            assert.strictEqual(inputBoxMock.hide.calledOnce, true);
        });
        
        it('should update title with preview when value changes', async () => {
            const variable = 'name';
            const pattern = 'file_{name}.txt';
            const currentVars = {};
            const userInput = 'test';
            
            // Мок для fileOperations.formatFilename
            const fileOperationsMock = {
                formatFilename: sinon.stub().returns('file_test.txt')
            };
            
            // Загружаем модуль с моком для fileOperations
            const editorViewWithMock = proxyquire('../../../src/common/editorView', {
                'vscode': vscodeMock,
                './fileOperations': fileOperationsMock
            });
            
            // Настраиваем поведение inputBox
            let valueChangeCallback;
            inputBoxMock.onDidChangeValue.callsFake(callback => {
                valueChangeCallback = callback;
            });
            
            inputBoxMock.onDidAccept.callsFake(callback => {
                inputBoxMock.value = userInput;
                callback();
            });
            
            const promptPromise = editorViewWithMock.promptForVariable(variable, pattern, currentVars);
            
            // Вызываем callback для изменения значения
            valueChangeCallback(userInput);
            
            // Проверяем, что title обновился
            assert.strictEqual(inputBoxMock.title, 'Name - Preview: file_test.txt');
            
            // Завершаем промис
            const result = await promptPromise;
            assert.strictEqual(result, userInput);
        });
        
        it('should not update title preview if value is empty', async () => {
            const variable = 'name';
            const pattern = 'file_{name}.txt';
            const currentVars = {};
            
            // Настраиваем поведение inputBox
            let valueChangeCallback;
            inputBoxMock.onDidChangeValue.callsFake(callback => {
                valueChangeCallback = callback;
            });
            
            inputBoxMock.onDidHide.callsFake(callback => {
                callback();
            });
            
            const promptPromise = editorView.promptForVariable(variable, pattern, currentVars);
            
            // Вызываем callback для изменения значения на пустую строку
            valueChangeCallback('');
            
            // Проверяем, что title не изменился
            assert.strictEqual(inputBoxMock.title, 'Name');
            
            // Завершаем промис
            await promptPromise;
        });
        
        it('should return value when input box is hidden', async () => {
            const variable = 'name';
            const pattern = 'file_{name}.txt';
            const currentVars = {};
            const userInput = 'test';
            
            // Настраиваем поведение inputBox
            inputBoxMock.onDidHide.callsFake(callback => {
                inputBoxMock.value = userInput;
                callback();
            });
            
            const result = await editorView.promptForVariable(variable, pattern, currentVars);
            
            assert.strictEqual(result, userInput);
        });
    });
}); 