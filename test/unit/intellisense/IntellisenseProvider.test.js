const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Импортируем мок vscode
const vscodeMock = require('../mocks/vscode');

// Используем proxyquire для загрузки модуля с нашими моками
const IntellisenseProvider = proxyquire('../../../src/intellisense/IntellisenseProvider', {
    'vscode': vscodeMock
});

describe('IntellisenseProvider', () => {
    let sandbox;
    let provider;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        provider = new IntellisenseProvider('test-language');
        
        // Сбрасываем моки vscode
        Object.values(vscodeMock.window).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.workspace).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.commands).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.languages).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('register', () => {
        it('should register a completion item provider with vscode.languages', () => {
            // Создаем стаб для registerCompletionItemProvider
            vscodeMock.languages.registerCompletionItemProvider = sinon.stub().returns('registration');
            
            const result = provider.register();
            
            assert.strictEqual(result, 'registration');
            assert.strictEqual(vscodeMock.languages.registerCompletionItemProvider.calledOnce, true);
            assert.deepStrictEqual(
                vscodeMock.languages.registerCompletionItemProvider.firstCall.args[0],
                [{ language: 'test-language', scheme: 'file' }]
            );
            
            // Проверяем, что второй аргумент - объект с методом provideCompletionItems
            const completionProvider = vscodeMock.languages.registerCompletionItemProvider.firstCall.args[1];
            assert.strictEqual(typeof completionProvider.provideCompletionItems, 'function');
        });
        
        it('should filter suggestions based on indentation validity', () => {
            // Создаем стаб для registerCompletionItemProvider
            vscodeMock.languages.registerCompletionItemProvider = sinon.stub().returns('registration');
            
            // Переопределяем абстрактные методы для теста
            provider.analyzeContext = sinon.stub().returns({
                activeTags: ['parentTag']
            });
            
            const mockSuggestions = [
                { command: { arguments: [{ valid: true }] } },
                { command: { arguments: [{ valid: false }] } }
            ];
            
            provider.getSuggestions = sinon.stub().returns(mockSuggestions);
            
            // Стаб для isIndentationValid, который возвращает true только для первого предложения
            provider.isIndentationValid = sinon.stub();
            provider.isIndentationValid.withArgs({ valid: true }, sinon.match.any, 'parentTag').returns(true);
            provider.isIndentationValid.withArgs({ valid: false }, sinon.match.any, 'parentTag').returns(false);
            
            const result = provider.register();
            
            // Получаем функцию provideCompletionItems
            const provideCompletionItems = vscodeMock.languages.registerCompletionItemProvider.firstCall.args[1].provideCompletionItems;
            
            // Вызываем функцию с моками документа и позиции
            const mockDocument = {};
            const mockPosition = {};
            const suggestions = provideCompletionItems(mockDocument, mockPosition);
            
            // Проверяем, что analyzeContext и getSuggestions были вызваны
            assert.strictEqual(provider.analyzeContext.calledOnce, true);
            assert.strictEqual(provider.getSuggestions.calledOnce, true);
            
            // Проверяем, что isIndentationValid был вызван для каждого предложения
            assert.strictEqual(provider.isIndentationValid.calledTwice, true);
            
            // Проверяем, что отфильтрованы только валидные предложения
            assert.strictEqual(suggestions.length, 1);
            assert.deepStrictEqual(suggestions[0], mockSuggestions[0]);
        });
    });
}); 