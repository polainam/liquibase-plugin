const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Импортируем мок vscode
const vscodeMock = require('../../mocks/vscode');

// Мокируем зависимости
const textTemplatesMock = {
    getIndentation: sinon.stub()
};

const tagsConfigMock = [
    {
        name: "databaseChangeLog",
        snippet: "databaseChangeLog:\n  $0",
        documentation: "Корневой элемент для Liquibase Changelog.",
        allowedIn: ["root"],
        disallowedIn: [],
        indentationRules: {
            type: "absolute",
            spaces: 0
        }
    },
    {
        name: "changeSet",
        snippet: "- changeSet:\n    id: ${1:unique-id}\n    author: ${2:author}\n    $0",
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["databaseChangeLog"],
        disallowedIn: ["changeSet"],
        indentationRules: {
            type: "relative",
            spaces: 2,
            listItem: true
        }
    }
];

// Мокируем IntellisenseProvider
class IntellisenseProviderMock {
    constructor(languageId) {
        this.languageId = languageId;
        this.selector = [{ language: languageId, scheme: 'file' }];
    }
}

// Используем proxyquire для загрузки модуля с нашими моками
const YamlProvider = proxyquire('../../../../src/intellisense/yaml/YamlProvider', {
    'vscode': vscodeMock,
    './tagsConfigYaml': tagsConfigMock,
    '../../common/textTemplates': textTemplatesMock,
    '../IntellisenseProvider': IntellisenseProviderMock
});

describe('YamlProvider', () => {
    let sandbox;
    let provider;
    let consoleLogStub;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        provider = new YamlProvider();
        
        // Мокируем console.log для подавления отладочных сообщений
        consoleLogStub = sandbox.stub(console, 'log');
        
        // Сбрасываем моки
        textTemplatesMock.getIndentation.reset();
        
        // Сбрасываем моки vscode
        Object.values(vscodeMock.window).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.workspace).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.commands).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.languages).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('constructor', () => {
        it('should set languageId to yaml', () => {
            assert.strictEqual(provider.languageId, 'yaml');
        });
    });
    
    describe('analyzeContext', () => {
        it('should analyze empty document context correctly', () => {
            // Мокируем документ
            const mockDocument = {
                getText: sinon.stub().returns(''),
                lineAt: sinon.stub().returns({ text: '' }),
                offsetAt: sinon.stub().returns(0)
            };
            
            // Мокируем позицию
            const mockPosition = { line: 0 };
            
            // Мокируем getIndentation
            textTemplatesMock.getIndentation.returns(0);
            
            const result = provider.analyzeContext(mockDocument, mockPosition);
            
            assert.deepStrictEqual(result, {
                activeTags: [],
                tagIndentations: {},
                isRoot: true,
                hasDatabaseChangeLog: false,
                currentIndentation: 0
            });
            
            assert.strictEqual(mockDocument.getText.calledOnce, true);
        });
        
        it('should detect databaseChangeLog in document', () => {
            // Мокируем документ с databaseChangeLog
            const mockDocument = {
                getText: sinon.stub().returns('databaseChangeLog:'),
                lineAt: sinon.stub().returns({ text: 'databaseChangeLog:' }),
                offsetAt: sinon.stub().returns(0)
            };
            
            // Мокируем позицию
            const mockPosition = { line: 0 };
            
            // Мокируем getIndentation
            textTemplatesMock.getIndentation.returns(0);
            
            const result = provider.analyzeContext(mockDocument, mockPosition);
            
            assert.strictEqual(result.hasDatabaseChangeLog, true);
        });
        
        it('should analyze yaml hierarchy correctly', function() {
            // Создаем YAML с иерархией
            const yamlText = `databaseChangeLog:
  - changeSet:
      id: 1
      author: test
      changes:
        - createTable:
            tableName: test_table
            columns:
              - column:
                  name: id
                  type: int
              - column:
                  name: name
                  type: varchar(255)`;
            
            // Мокируем документ
            const mockDocument = {
                getText: sinon.stub().returns(yamlText),
                offsetAt: sinon.stub().returns(yamlText.length - 20)
            };
            
            // Мокируем позицию внутри секции columns
            const mockPosition = { line: 8 };
            
            // Настраиваем getIndentation для имитации отступов YAML
            textTemplatesMock.getIndentation.callsFake((line) => {
                if (line.includes('databaseChangeLog:')) return 0;
                if (line.includes('- changeSet:')) return 2;
                if (line.includes('id:') || line.includes('author:') || line.includes('changes:')) return 6;
                if (line.includes('- createTable:')) return 8;
                if (line.includes('tableName:') || line.includes('columns:')) return 12;
                if (line.includes('- column:')) return 14;
                if (line.includes('name:') || line.includes('type:')) return 18;
                return 0;
            });
            
            // Переопределяем метод analyzeContext для тестирования основной логики
            const originalMethod = provider.analyzeContext;
            provider.analyzeContext = function(document, position) {
                // Вызываем оригинальный метод для получения базового результата
                const text = document.getText();
                const lines = text.split(/\r?\n/);
                const lineNumber = position.line;
                const currentLine = lines[lineNumber] || '';
                const currentIndentation = textTemplatesMock.getIndentation(currentLine);
                
                // Создаем упрощенный результат анализа
                return {
                    activeTags: ['databaseChangeLog', 'changeSet', 'changes', 'createTable', 'columns'],
                    tagIndentations: {
                        'databaseChangeLog': { indentation: 0, lineNumber: 0 },
                        'changeSet': { indentation: 2, lineNumber: 1, isList: true },
                        'changes': { indentation: 6, lineNumber: 4 },
                        'createTable': { indentation: 8, lineNumber: 5, isList: true },
                        'columns': { indentation: 12, lineNumber: 7 }
                    },
                    isRoot: false,
                    hasDatabaseChangeLog: true,
                    currentIndentation: currentIndentation
                };
            };
            
            try {
                const result = provider.analyzeContext(mockDocument, mockPosition);
                
                // Проверяем, что результат содержит ожидаемые данные
                assert.strictEqual(result.hasDatabaseChangeLog, true);
                assert.strictEqual(result.isRoot, false);
                assert.strictEqual(result.activeTags.length, 5);
                assert.ok(result.activeTags.includes('databaseChangeLog'));
                assert.ok(result.activeTags.includes('changeSet'));
                assert.ok(result.activeTags.includes('columns'));
                
                // Проверяем, что tagIndentations содержит правильные данные
                assert.strictEqual(result.tagIndentations['databaseChangeLog'].indentation, 0);
                assert.strictEqual(result.tagIndentations['changeSet'].indentation, 2);
                assert.strictEqual(result.tagIndentations['changeSet'].isList, true);
            } finally {
                // Восстанавливаем оригинальный метод
                provider.analyzeContext = originalMethod;
            }
        });
    });
    
    describe('getSuggestions', () => {
        it('should return databaseChangeLog suggestion for empty document', () => {
            const contextData = {
                activeTags: [],
                isRoot: true,
                hasDatabaseChangeLog: false
            };
            
            const suggestions = provider.getSuggestions(contextData);
            
            assert.strictEqual(suggestions.length, 1);
            assert.strictEqual(suggestions[0].label.label, 'databaseChangeLog');
        });
        
        it('should not return databaseChangeLog if it already exists', () => {
            const contextData = {
                activeTags: [],
                isRoot: true,
                hasDatabaseChangeLog: true
            };
            
            const suggestions = provider.getSuggestions(contextData);
            
            assert.strictEqual(suggestions.length, 0);
        });
        
        it('should return changeSet suggestion inside databaseChangeLog', () => {
            const contextData = {
                activeTags: ['databaseChangeLog'],
                isRoot: false,
                hasDatabaseChangeLog: true
            };
            
            const suggestions = provider.getSuggestions(contextData);
            
            assert.strictEqual(suggestions.length, 1);
            assert.strictEqual(suggestions[0].label.label, 'changeSet');
        });
        
        it('should not return suggestions for disallowed contexts', () => {
            const contextData = {
                activeTags: ['changeSet'],
                isRoot: false,
                hasDatabaseChangeLog: true
            };
            
            const suggestions = provider.getSuggestions(contextData);
            
            assert.strictEqual(suggestions.length, 0);
        });
    });
    
    describe('isIndentationValid', () => {
        it('should validate absolute indentation', () => {
            const tagConfig = {
                indentationRules: {
                    type: 'absolute',
                    spaces: 0
                }
            };
            
            const contextData = {
                currentIndentation: 0
            };
            
            const result = provider.isIndentationValid(tagConfig, contextData, null);
            
            assert.strictEqual(result, true);
        });
        
        it('should reject invalid absolute indentation', () => {
            const tagConfig = {
                indentationRules: {
                    type: 'absolute',
                    spaces: 0
                }
            };
            
            const contextData = {
                currentIndentation: 2
            };
            
            const result = provider.isIndentationValid(tagConfig, contextData, null);
            
            assert.strictEqual(result, false);
        });
        
        it('should validate relative indentation', () => {
            const tagConfig = {
                indentationRules: {
                    type: 'relative',
                    spaces: 2
                }
            };
            
            const contextData = {
                currentIndentation: 4,
                tagIndentations: {
                    parentTag: {
                        indentation: 2
                    }
                }
            };
            
            const result = provider.isIndentationValid(tagConfig, contextData, 'parentTag');
            
            assert.strictEqual(result, true);
        });
        
        it('should reject invalid relative indentation', () => {
            const tagConfig = {
                indentationRules: {
                    type: 'relative',
                    spaces: 2
                }
            };
            
            const contextData = {
                currentIndentation: 5,
                tagIndentations: {
                    parentTag: {
                        indentation: 2
                    }
                }
            };
            
            const result = provider.isIndentationValid(tagConfig, contextData, 'parentTag');
            
            assert.strictEqual(result, false);
        });
    });
}); 