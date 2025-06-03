const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const moment = require('moment');

// Моки для зависимостей
const workspaceConfigMock = {
    getConfigValue: sinon.stub()
};

const editorViewMock = {
    promptForVariable: sinon.stub()
};

// Загружаем модуль с моками
const textTemplates = proxyquire('../../../src/common/textTemplates', {
    './workspaceConfig': workspaceConfigMock,
    './editorView': editorViewMock
});

describe('textTemplates', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        workspaceConfigMock.getConfigValue.reset();
        editorViewMock.promptForVariable.reset();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('extractVariablesFromPattern', () => {
        it('should extract variables from pattern with curly braces', () => {
            const pattern = 'changelog_{date}_{name}.{ext}';
            const expectedVariables = ['date', 'name', 'ext'];
            
            const result = textTemplates.extractVariablesFromPattern(pattern);
            
            assert.deepStrictEqual(result, expectedVariables);
        });
        
        it('should return empty array for pattern without variables', () => {
            const pattern = 'changelog.xml';
            
            const result = textTemplates.extractVariablesFromPattern(pattern);
            
            assert.deepStrictEqual(result, []);
        });
        
        it('should handle empty pattern', () => {
            const pattern = '';
            
            const result = textTemplates.extractVariablesFromPattern(pattern);
            
            assert.deepStrictEqual(result, []);
        });
        
        it('should handle pattern with repeated variables', () => {
            const pattern = '{name}_{name}.{ext}';
            const expectedVariables = ['name', 'name', 'ext'];
            
            const result = textTemplates.extractVariablesFromPattern(pattern);
            
            assert.deepStrictEqual(result, expectedVariables);
        });
    });
    
    describe('gatherVariableValues', () => {
        it('should gather variable values for pattern', async () => {
            const pattern = 'changelog_{date}_{name}.{ext}';
            const initialVars = { ext: 'xml' };
            const promptedValues = { date: '20230101', name: 'test' };
            
            editorViewMock.promptForVariable.withArgs('date', pattern, { ext: 'xml' }).resolves(promptedValues.date);
            editorViewMock.promptForVariable.withArgs('name', pattern, { ext: 'xml', date: '20230101' }).resolves(promptedValues.name);
            
            const result = await textTemplates.gatherVariableValues(pattern, initialVars);
            
            assert.deepStrictEqual(result, { ...initialVars, ...promptedValues });
            assert.strictEqual(editorViewMock.promptForVariable.callCount, 2);
        });
        
        it('should use existing values from initialVars', async () => {
            const pattern = 'changelog_{date}_{name}.{ext}';
            const initialVars = { ext: 'xml', date: '20230101' };
            const promptedValues = { name: 'test' };
            
            editorViewMock.promptForVariable.withArgs('name', pattern, initialVars).resolves(promptedValues.name);
            
            const result = await textTemplates.gatherVariableValues(pattern, initialVars);
            
            assert.deepStrictEqual(result, { ...initialVars, ...promptedValues });
            assert.strictEqual(editorViewMock.promptForVariable.callCount, 1);
        });
        
        it('should return null if user cancels input', async () => {
            const pattern = 'changelog_{date}.{ext}';
            const initialVars = { ext: 'xml' };
            
            editorViewMock.promptForVariable.withArgs('date', pattern, initialVars).resolves(null);
            
            const result = await textTemplates.gatherVariableValues(pattern, initialVars);
            
            assert.strictEqual(result, null);
            assert.strictEqual(editorViewMock.promptForVariable.callCount, 1);
        });
        
        it('should handle pattern without variables', async () => {
            const pattern = 'changelog.xml';
            const initialVars = {};
            
            const result = await textTemplates.gatherVariableValues(pattern, initialVars);
            
            assert.deepStrictEqual(result, initialVars);
            assert.strictEqual(editorViewMock.promptForVariable.callCount, 0);
        });
    });
    
    describe('getInitialVariables', () => {
        it('should return initial variables with author, date and extension', () => {
            const format = 'XML';
            const author = 'testAuthor';
            const dateFormat = 'YYYYMMDD';
            const formattedDate = moment().format(dateFormat);
            
            workspaceConfigMock.getConfigValue.withArgs('defaultAuthor').returns(author);
            workspaceConfigMock.getConfigValue.withArgs('dateFormatInFilenames').returns(dateFormat);
            
            const result = textTemplates.getInitialVariables({}, format);
            
            assert.deepStrictEqual(result, {
                ext: 'xml',
                author: author,
                date: formattedDate
            });
            
            assert.strictEqual(workspaceConfigMock.getConfigValue.callCount, 2);
        });
        
        it('should handle lowercase format', () => {
            const format = 'xml';
            const author = 'testAuthor';
            const dateFormat = 'YYYYMMDD';
            const formattedDate = moment().format(dateFormat);
            
            workspaceConfigMock.getConfigValue.withArgs('defaultAuthor').returns(author);
            workspaceConfigMock.getConfigValue.withArgs('dateFormatInFilenames').returns(dateFormat);
            
            const result = textTemplates.getInitialVariables({}, format);
            
            assert.deepStrictEqual(result, {
                ext: 'xml',
                author: author,
                date: formattedDate
            });
        });
    });
    
    describe('getIndentation', () => {
        it('should return number of spaces at beginning of line', () => {
            const line = '    some text';
            const expectedIndentation = 4;
            
            const result = textTemplates.getIndentation(line);
            
            assert.strictEqual(result, expectedIndentation);
        });
        
        it('should return 0 for line without indentation', () => {
            const line = 'some text';
            
            const result = textTemplates.getIndentation(line);
            
            assert.strictEqual(result, 0);
        });
        
        it('should handle tabs as indentation', () => {
            const line = '\t\tsome text';
            const expectedIndentation = 2; // Считаем количество символов, а не визуальную ширину
            
            const result = textTemplates.getIndentation(line);
            
            assert.strictEqual(result, expectedIndentation);
        });
        
        it('should handle mixed tabs and spaces', () => {
            const line = '  \t  some text';
            const expectedIndentation = 5;
            
            const result = textTemplates.getIndentation(line);
            
            assert.strictEqual(result, expectedIndentation);
        });
        
        it('should handle empty line', () => {
            const line = '';
            
            const result = textTemplates.getIndentation(line);
            
            assert.strictEqual(result, 0);
        });
    });
}); 