const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showQuickPick: sinon.stub()
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

// Используем proxyquire для загрузки модуля с нашими моками
const configureDefaultFormats = proxyquire('../../../../src/wizard/steps/configureDefaultFormats', {
    'vscode': vscodeMock,
    '../../common/workspaceConfig': workspaceConfigMock
});

describe('configureDefaultFormats', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showQuickPick.reset();
        workspaceConfigMock.getLiquibaseConfig.reset();
        configMock.get.reset();
        configMock.update.reset();
        
        // Настраиваем стандартное поведение моков
        workspaceConfigMock.getLiquibaseConfig.returns(configMock);
        configMock.update.resolves();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    it('should update configuration with selected formats', async () => {
        configMock.get.withArgs('defaultChangelogFormat').returns('xml');
        configMock.get.withArgs('defaultChangesetFormat').returns('yaml');
        
        // Мокируем выбор форматов пользователем
        vscodeMock.window.showQuickPick.onFirstCall().resolves({ label: 'JSON' });
        vscodeMock.window.showQuickPick.onSecondCall().resolves({ label: 'SQL' });
        
        const result = await configureDefaultFormats();
        
        // Проверяем, что конфигурация обновлена правильно
        assert.strictEqual(configMock.update.calledTwice, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['defaultChangelogFormat', 'json', true]);
        assert.deepStrictEqual(configMock.update.secondCall.args, ['defaultChangesetFormat', 'sql', true]);
        
        // Проверяем возвращаемое значение
        assert.deepStrictEqual(result, {
            changelogFormat: 'json',
            changesetFormat: 'sql'
        });
        
        // Проверяем, что showQuickPick был вызван с правильными параметрами
        assert.strictEqual(vscodeMock.window.showQuickPick.calledTwice, true);
        
        // Проверяем первый вызов (для changelog)
        const firstCallArgs = vscodeMock.window.showQuickPick.firstCall.args[0];
        assert.strictEqual(firstCallArgs.length, 4); // XML, YAML, JSON, SQL
        assert.strictEqual(firstCallArgs.find(opt => opt.label === 'XML').picked, true);
        
        // Проверяем второй вызов (для changeset)
        const secondCallArgs = vscodeMock.window.showQuickPick.secondCall.args[0];
        assert.strictEqual(secondCallArgs.length, 4); // XML, YAML, JSON, SQL
        assert.strictEqual(secondCallArgs.find(opt => opt.label === 'YAML').picked, true);
    });
    
    it('should return null if user cancels second selection', async () => {
        configMock.get.withArgs('defaultChangelogFormat').returns('xml');
        configMock.get.withArgs('defaultChangesetFormat').returns('yaml');
        
        // Пользователь отменяет второй выбор
        vscodeMock.window.showQuickPick.onFirstCall().resolves({ label: 'JSON' });
        vscodeMock.window.showQuickPick.onSecondCall().resolves(null);
        
        const result = await configureDefaultFormats();
        
        // Проверяем, что функция вернула null
        assert.strictEqual(result, null);
        
        // Проверяем, что конфигурация не обновлялась
        assert.strictEqual(configMock.update.called, false);
        
        // Проверяем, что оба выбора были запрошены
        assert.strictEqual(vscodeMock.window.showQuickPick.calledTwice, true);
    });
    
    it('should handle case when no current formats are configured', async () => {
        configMock.get.withArgs('defaultChangelogFormat').returns(undefined);
        configMock.get.withArgs('defaultChangesetFormat').returns(undefined);
        
        vscodeMock.window.showQuickPick.onFirstCall().resolves({ label: 'XML' });
        vscodeMock.window.showQuickPick.onSecondCall().resolves({ label: 'YAML' });
        
        const result = await configureDefaultFormats();
        
        // Проверяем, что конфигурация обновлена правильно
        assert.strictEqual(configMock.update.calledTwice, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['defaultChangelogFormat', 'xml', true]);
        assert.deepStrictEqual(configMock.update.secondCall.args, ['defaultChangesetFormat', 'yaml', true]);
        
        // Проверяем возвращаемое значение
        assert.deepStrictEqual(result, {
            changelogFormat: 'xml',
            changesetFormat: 'yaml'
        });
        
        // Проверяем, что в опциях нет выбранных элементов по умолчанию
        const firstCallArgs = vscodeMock.window.showQuickPick.firstCall.args[0];
        assert.strictEqual(firstCallArgs.every(opt => !opt.picked), true);
        
        const secondCallArgs = vscodeMock.window.showQuickPick.secondCall.args[0];
        assert.strictEqual(secondCallArgs.every(opt => !opt.picked), true);
    });
}); 