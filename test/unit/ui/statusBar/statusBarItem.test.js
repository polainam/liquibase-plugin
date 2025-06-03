const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для элемента строки состояния
const statusBarItemMock = {
    text: '',
    tooltip: '',
    color: '',
    command: null,
    show: sinon.stub()
};

// Моки для зависимостей
const vscodeMock = {
    window: {
        createStatusBarItem: sinon.stub().returns(statusBarItemMock)
    },
    StatusBarAlignment: {
        Left: 'Left'
    }
};

// Загружаем модуль с моками
const statusBarItem = proxyquire('../../../../src/ui/statusBar/statusBarItem', {
    'vscode': vscodeMock
});

describe('statusBarItem', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.createStatusBarItem.reset();
        statusBarItemMock.show.reset();
        
        // Сбрасываем свойства
        statusBarItemMock.text = '';
        statusBarItemMock.tooltip = '';
        statusBarItemMock.color = '';
        statusBarItemMock.command = null;
        
        // Настраиваем мок для createStatusBarItem
        vscodeMock.window.createStatusBarItem.returns(statusBarItemMock);
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('createGeneralStatusBarItem', () => {
        it('should create a status bar item with correct properties', () => {
            const result = statusBarItem.createGeneralStatusBarItem();
            
            // Проверяем, что createStatusBarItem был вызван с правильными параметрами
            assert.strictEqual(vscodeMock.window.createStatusBarItem.calledOnce, true);
            assert.strictEqual(vscodeMock.window.createStatusBarItem.firstCall.args[0], 'Left');
            
            // Проверяем, что свойства элемента строки состояния установлены правильно
            assert.strictEqual(statusBarItemMock.text, '$(extensions) Liquibase');
            assert.strictEqual(statusBarItemMock.tooltip, 'Execute Liquibase command');
            assert.strictEqual(statusBarItemMock.color, '#2962ff');
            assert.deepStrictEqual(statusBarItemMock.command, {
                command: 'workbench.action.quickOpen',
                arguments: ['>Liquibase: '],
                title: 'Open Command Palette'
            });
            
            // Проверяем, что элемент строки состояния был показан
            assert.strictEqual(statusBarItemMock.show.calledOnce, true);
        });
        
        it('should return the created status bar item', () => {
            const result = statusBarItem.createGeneralStatusBarItem();
            
            assert.strictEqual(result, statusBarItemMock);
        });
    });
}); 