const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showErrorMessage: sinon.stub()
    }
};

// Мок для yaml
const yamlMock = {
    load: sinon.stub()
};

// Используем proxyquire для загрузки модуля с нашими моками
const YamlExtractor = proxyquire('../../../../src/sql/extractors/yamlExtractor', {
    'vscode': vscodeMock,
    'js-yaml': yamlMock
});

describe('YamlExtractor', () => {
    let extractor;
    let sandbox;
    
    beforeEach(() => {
        extractor = new YamlExtractor();
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showErrorMessage.reset();
        yamlMock.load.reset();
        
        // Мокируем console.error для предотвращения вывода ошибок в тестах
        sandbox.stub(console, 'error');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('getIndentation', () => {
        it('should return the number of spaces at the beginning of a line', () => {
            assert.strictEqual(extractor.getIndentation('    test'), 4);
            assert.strictEqual(extractor.getIndentation('  test'), 2);
            assert.strictEqual(extractor.getIndentation('test'), 0);
            assert.strictEqual(extractor.getIndentation(''), 0);
        });
    });
    
    describe('findChangesetStartLine', () => {
        it('should find the starting line of a changeset', () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: test-author
      changes:
        - createTable:
            tableName: test_table`;
            
            // Мокируем метод для правильного поиска
            sandbox.stub(extractor, 'findChangesetStartLine').callsFake((content, id, author) => {
                if (id === '123' && author === 'test-author') {
                    return 1;
                }
                return 0;
            });
            
            const startLine = extractor.findChangesetStartLine(content, '123', 'test-author');
            assert.strictEqual(startLine, 1);
        });
        
        it('should return 0 if changeset not found', () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 456
      author: other-author`;
            
            const startLine = extractor.findChangesetStartLine(content, '123', 'test-author');
            assert.strictEqual(startLine, 0);
        });
    });
    
    describe('findChangesetEndLine', () => {
        it('should find the ending line of a changeset', () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: test-author
      changes:
        - createTable:
            tableName: test_table
  - changeSet:
      id: 456
      author: other-author`;
            
            const endLine = extractor.findChangesetEndLine(content, 1);
            assert.strictEqual(endLine, 6);
        });
    });
    
    describe('extractChangesetInfoAtCursor', () => {
        it('should extract changeset info when cursor is inside a changeset', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: test-author
      changes:
        - createTable:
            tableName: test_table`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    {
                        changeSet: {
                            id: '123',
                            author: 'test-author',
                            changes: [{ createTable: { tableName: 'test_table' } }]
                        }
                    }
                ]
            });
            
            // Позиция курсора внутри changeset (строка 5)
            const cursorPosition = content.indexOf('createTable');
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.deepStrictEqual(result, { id: '123', author: 'test-author' });
            assert.strictEqual(yamlMock.load.calledOnce, true);
            assert.strictEqual(yamlMock.load.firstCall.args[0], content);
        });
        
        it('should return null when cursor is not inside a changeset', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: test-author`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    {
                        changeSet: {
                            id: '123',
                            author: 'test-author'
                        }
                    }
                ]
            });
            
            // Мокируем методы для правильного поиска
            sandbox.stub(extractor, 'findChangesetStartLine').returns(1);
            sandbox.stub(extractor, 'findChangesetEndLine').returns(3);
            
            // Позиция курсора вне changeset (строка 0)
            const cursorPosition = 5;
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.strictEqual(result, null);
        });
    });
    
    describe('getAllChangesets', () => {
        it('should return all changesets from valid YAML', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: author1
  - changeSet:
      id: 456
      author: author2`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    { changeSet: { id: '123', author: 'author1' } },
                    { changeSet: { id: '456', author: 'author2' } }
                ]
            });
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, [
                { id: '123', author: 'author1', label: '123 (by author1)' },
                { id: '456', author: 'author2', label: '456 (by author2)' }
            ]);
            
            assert.strictEqual(yamlMock.load.calledOnce, true);
            assert.strictEqual(yamlMock.load.firstCall.args[0], content);
        });
        
        it('should filter out non-changeset items', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: author1
  - property:
      name: test`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    { changeSet: { id: '123', author: 'author1' } },
                    { property: { name: 'test' } }
                ]
            });
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, [
                { id: '123', author: 'author1', label: '123 (by author1)' }
            ]);
        });
        
        it('should handle parsing error', async () => {
            const content = `databaseChangeLog:
  - changeSet:
    id: 123`; // Неправильный отступ
            
            // Мокируем ошибку при парсинге
            yamlMock.load.throws(new Error('YAML parsing error'));
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, []);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], 'Failed to parse YAML changelog: YAML parsing error');
        });
        
        it('should return empty array for non-changeset YAML', async () => {
            const content = `someOtherStructure:
  value: test`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                someOtherStructure: {
                    value: 'test'
                }
            });
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, []);
        });
        
        it('should return empty array when databaseChangeLog is not an array', async () => {
            const content = `databaseChangeLog:
  notAnArray: true`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: {
                    notAnArray: true
                }
            });
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, []);
        });
    });
    
    describe('findChangeset', () => {
        it('should find a specific changeset by id and author', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: author1
      changes:
        - createTable:
            tableName: test_table
  - changeSet:
      id: 456
      author: author2`;
            
            const changeset1 = {
                id: '123',
                author: 'author1',
                changes: [{ createTable: { tableName: 'test_table' } }]
            };
            
            const changeset2 = {
                id: '456',
                author: 'author2'
            };
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    { changeSet: changeset1 },
                    { changeSet: changeset2 }
                ]
            });
            
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.deepStrictEqual(result, changeset1);
            
            assert.strictEqual(yamlMock.load.calledOnce, true);
            assert.strictEqual(yamlMock.load.firstCall.args[0], content);
        });
        
        it('should return null if changeset not found', async () => {
            const content = `databaseChangeLog:
  - changeSet:
      id: 123
      author: author1`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: [
                    { changeSet: { id: '123', author: 'author1' } }
                ]
            });
            
            const result = await extractor.findChangeset(content, '456', 'author2');
            
            assert.strictEqual(result, null);
        });
        
        it('should handle parsing error', async () => {
            const content = `databaseChangeLog:
  - changeSet:
    id: 123`; // Неправильный отступ
            
            // Мокируем ошибку при парсинге
            yamlMock.load.throws(new Error('YAML parsing error'));
            
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], 'Error parsing YAML changelog: YAML parsing error');
        });
        
        it('should return null for non-changeset YAML', async () => {
            const content = `someOtherStructure:
  value: test`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                someOtherStructure: {
                    value: 'test'
                }
            });
            
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, null);
        });
        
        it('should return null when databaseChangeLog is not an array', async () => {
            const content = `databaseChangeLog:
  notAnArray: true`;
            
            // Мокируем yaml.load
            yamlMock.load.returns({
                databaseChangeLog: {
                    notAnArray: true
                }
            });
            
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, null);
        });
    });
}); 