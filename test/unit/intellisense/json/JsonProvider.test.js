const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Импортируем мок vscode
const vscodeMock = require('../../mocks/vscode');

// Мокируем зависимости
const jsonc = {
    getLocation: sinon.stub()
};

const textTemplatesMock = {
    getIndentation: sinon.stub()
};

const tagsConfigMock = [
    {
        name: "databaseChangeLog",
        snippet: "{\n  \"databaseChangeLog\": [\n    $0\n  ]\n}",
        documentation: "Корневой элемент для Liquibase Changelog в JSON формате.",
        allowedIn: ["root"],
        disallowedIn: [],
        indentationRules: {
            type: "absolute",
            spaces: 0
        }
    },
    {
        name: "changeSet",
        snippet: "{\n  \"changeSet\": {\n    \"id\": \"${1:unique-id}\",\n    \"author\": \"${2:author}\"\n    $0\n  }\n},",
        documentation: "Тег для описания изменений в базе данных.",
        allowedIn: ["databaseChangeLog"],
        disallowedIn: ["changeSet"],
        indentationRules: {
            type: "relative",
            spaces: 2
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
const JsonProvider = proxyquire('../../../../src/intellisense/json/JsonProvider', {
    'vscode': vscodeMock,
    'jsonc-parser': jsonc,
    './tagsConfigJson': tagsConfigMock,
    '../../common/textTemplates': textTemplatesMock,
    '../IntellisenseProvider': IntellisenseProviderMock
});

describe('JsonProvider', () => {
    let sandbox;
    let provider;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        provider = new JsonProvider();
        
        // Сбрасываем моки
        jsonc.getLocation.reset();
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
            
            // Мокируем getLocation
            jsonc.getLocation.returns({ path: [] });
            
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
            assert.strictEqual(mockDocument.offsetAt.calledOnce, true);
            assert.strictEqual(jsonc.getLocation.calledOnce, true);
            assert.strictEqual(textTemplatesMock.getIndentation.calledOnce, true);
        });
        
        it('should detect databaseChangeLog in document', () => {
            // Мокируем документ с databaseChangeLog
            const mockDocument = {
                getText: sinon.stub().returns('{"databaseChangeLog": []}'),
                lineAt: sinon.stub().returns({ text: '{"databaseChangeLog": []}' }),
                offsetAt: sinon.stub().returns(0)
            };
            
            // Мокируем позицию
            const mockPosition = { line: 0 };
            
            // Мокируем getLocation
            jsonc.getLocation.returns({ path: [] });
            
            // Мокируем getIndentation
            textTemplatesMock.getIndentation.returns(0);
            
            const result = provider.analyzeContext(mockDocument, mockPosition);
            
            assert.strictEqual(result.hasDatabaseChangeLog, true);
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
            assert.strictEqual(suggestions[0].label, 'databaseChangeLog');
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
    });
}); 