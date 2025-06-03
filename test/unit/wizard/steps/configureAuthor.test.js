const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showInputBox: sinon.stub()
    }
};

// Мок для workspaceConfig
const workspaceConfigMock = {
    getLiquibaseConfig: sinon.stub()
};

// Мок для конфигурации
const configMock = {
    get: sinon.stub(),
    update: sinon.stub()
};

// Сохраняем оригинальные переменные окружения
const originalEnv = { ...process.env };

// Используем proxyquire для загрузки модуля с нашими моками
const configureAuthor = proxyquire('../../../../src/wizard/steps/configureAuthor', {
    'vscode': vscodeMock,
    '../../common/workspaceConfig': workspaceConfigMock
});

describe('configureAuthor', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showInputBox.reset();
        workspaceConfigMock.getLiquibaseConfig.reset();
        configMock.get.reset();
        configMock.update.reset();
        
        // Настраиваем стандартное поведение моков
        workspaceConfigMock.getLiquibaseConfig.returns(configMock);
        configMock.update.resolves();
    });
    
    afterEach(() => {
        sandbox.restore();
        // Восстанавливаем оригинальные переменные окружения
        process.env = { ...originalEnv };
    });
    
    it('should use configured author if available', async () => {
        const configuredAuthor = 'configured.author@example.com';
        configMock.get.withArgs('defaultAuthor').returns(configuredAuthor);
        vscodeMock.window.showInputBox.resolves('new.author@example.com');
        
        await configureAuthor();
        
        assert.strictEqual(vscodeMock.window.showInputBox.calledOnce, true);
        assert.strictEqual(vscodeMock.window.showInputBox.firstCall.args[0].value, configuredAuthor);
    });
    
    it('should use empty string if no env variables or configured author', async () => {
        process.env.USER = undefined;
        process.env.USERNAME = undefined;
        configMock.get.withArgs('defaultAuthor').returns(undefined);
        vscodeMock.window.showInputBox.resolves('new.author@example.com');
        
        await configureAuthor();
        
        assert.strictEqual(vscodeMock.window.showInputBox.calledOnce, true);
        assert.strictEqual(vscodeMock.window.showInputBox.firstCall.args[0].value, '');
    });
    
    it('should update configuration with new author', async () => {
        const newAuthor = 'new.author@example.com';
        configMock.get.withArgs('defaultAuthor').returns(undefined);
        vscodeMock.window.showInputBox.resolves(newAuthor);
        
        const result = await configureAuthor();
        
        assert.strictEqual(result, newAuthor);
        assert.strictEqual(configMock.update.calledOnce, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['defaultAuthor', newAuthor, true]);
    });
}); 