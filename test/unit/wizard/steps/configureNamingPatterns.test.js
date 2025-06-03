const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showInputBox: sinon.stub(),
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
const configureNamingPatterns = proxyquire('../../../../src/wizard/steps/configureNamingPatterns', {
    'vscode': vscodeMock,
    '../../common/workspaceConfig': workspaceConfigMock
});

describe('configureNamingPatterns', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showInputBox.reset();
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
    
    it('should update configuration with Object-oriented approach', async () => {
        // Настраиваем текущие значения конфигурации
        configMock.get.withArgs('dateFormatInFilenames').returns('YYYYMMDD');
        configMock.get.withArgs('changelogNamingPattern').returns('old-changelog-pattern.{ext}');
        configMock.get.withArgs('changesetNamingPattern').returns('old-changeset-pattern.{ext}');
        
        // Настраиваем ответы пользователя
        vscodeMock.window.showInputBox.onFirstCall().resolves('YYYYMMDD_HHmmss'); // Формат даты
        vscodeMock.window.showQuickPick.resolves({ label: 'Object-oriented' }); // Подход
        vscodeMock.window.showInputBox.onSecondCall().resolves('changelog-{object}.{ext}'); // Паттерн для changelog
        vscodeMock.window.showInputBox.onThirdCall().resolves('changeset-{date}-{name}.{ext}'); // Паттерн для changeset
        
        const result = await configureNamingPatterns();
        
        // Проверяем, что конфигурация обновлена правильно
        assert.strictEqual(configMock.update.callCount, 4);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['dateFormatInFilenames', 'YYYYMMDD_HHmmss', true]);
        assert.deepStrictEqual(configMock.update.secondCall.args, ['changelogNamingPattern', 'changelog-{object}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.thirdCall.args, ['changesetNamingPattern', 'changeset-{date}-{name}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.getCall(3).args, ['projectStructureApproach', 'Object-oriented', true]);
        
        // Проверяем возвращаемое значение
        assert.deepStrictEqual(result, {
            dateFormat: 'YYYYMMDD_HHmmss',
            changelogPattern: 'changelog-{object}.{ext}',
            changesetPattern: 'changeset-{date}-{name}.{ext}',
            approach: 'Object-oriented'
        });
    });
    
    it('should update configuration with Release-oriented approach', async () => {
        // Настраиваем текущие значения конфигурации
        configMock.get.withArgs('dateFormatInFilenames').returns('YYYYMMDD');
        
        // Настраиваем ответы пользователя
        vscodeMock.window.showInputBox.onFirstCall().resolves('YYYYMMDD'); // Формат даты
        vscodeMock.window.showQuickPick.resolves({ label: 'Release-oriented' }); // Подход
        vscodeMock.window.showInputBox.onSecondCall().resolves('changelog-{release}.{ext}'); // Паттерн для changelog
        vscodeMock.window.showInputBox.onThirdCall().resolves('changeset-{date}-{name}.{ext}'); // Паттерн для changeset
        
        const result = await configureNamingPatterns();
        
        // Проверяем, что конфигурация обновлена правильно
        assert.strictEqual(configMock.update.callCount, 4);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['dateFormatInFilenames', 'YYYYMMDD', true]);
        assert.deepStrictEqual(configMock.update.secondCall.args, ['changelogNamingPattern', 'changelog-{release}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.thirdCall.args, ['changesetNamingPattern', 'changeset-{date}-{name}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.getCall(3).args, ['projectStructureApproach', 'Release-oriented', true]);
        
        // Проверяем возвращаемое значение
        assert.deepStrictEqual(result, {
            dateFormat: 'YYYYMMDD',
            changelogPattern: 'changelog-{release}.{ext}',
            changesetPattern: 'changeset-{date}-{name}.{ext}',
            approach: 'Release-oriented'
        });
    });
    
    it('should update configuration with Custom approach', async () => {
        // Настраиваем текущие значения конфигурации
        configMock.get.withArgs('dateFormatInFilenames').returns('YYYYMMDD');
        configMock.get.withArgs('changelogNamingPattern').returns('custom-changelog-{date}.{ext}');
        configMock.get.withArgs('changesetNamingPattern').returns('custom-changeset-{author}-{name}.{ext}');
        
        // Настраиваем ответы пользователя
        vscodeMock.window.showInputBox.onFirstCall().resolves('YYYY-MM-DD'); // Формат даты
        vscodeMock.window.showQuickPick.resolves({ label: 'Custom' }); // Подход
        vscodeMock.window.showInputBox.onSecondCall().resolves('custom-changelog-{date}-{name}.{ext}'); // Паттерн для changelog
        vscodeMock.window.showInputBox.onThirdCall().resolves('custom-changeset-{author}-{object}.{ext}'); // Паттерн для changeset
        
        const result = await configureNamingPatterns();
        
        // Проверяем, что конфигурация обновлена правильно
        assert.strictEqual(configMock.update.callCount, 4);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['dateFormatInFilenames', 'YYYY-MM-DD', true]);
        assert.deepStrictEqual(configMock.update.secondCall.args, ['changelogNamingPattern', 'custom-changelog-{date}-{name}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.thirdCall.args, ['changesetNamingPattern', 'custom-changeset-{author}-{object}.{ext}', true]);
        assert.deepStrictEqual(configMock.update.getCall(3).args, ['projectStructureApproach', 'Custom', true]);
        
        // Проверяем возвращаемое значение
        assert.deepStrictEqual(result, {
            dateFormat: 'YYYY-MM-DD',
            changelogPattern: 'custom-changelog-{date}-{name}.{ext}',
            changesetPattern: 'custom-changeset-{author}-{object}.{ext}',
            approach: 'Custom'
        });
    });
    
    it('should use default patterns if no current patterns are configured', async () => {
        // Настраиваем текущие значения конфигурации
        configMock.get.withArgs('dateFormatInFilenames').returns('YYYYMMDD');
        configMock.get.withArgs('changelogNamingPattern').returns(undefined);
        configMock.get.withArgs('changesetNamingPattern').returns(undefined);
        
        // Настраиваем ответы пользователя
        vscodeMock.window.showInputBox.onFirstCall().resolves('YYYYMMDD');
        vscodeMock.window.showQuickPick.resolves({ label: 'Object-oriented' });
        vscodeMock.window.showInputBox.onSecondCall().resolves('changelog-{object}.{ext}');
        vscodeMock.window.showInputBox.onThirdCall().resolves('changeset-{date}-{name}.{ext}');
        
        await configureNamingPatterns();
        
        // Проверяем, что в showInputBox переданы правильные значения по умолчанию
        assert.strictEqual(vscodeMock.window.showInputBox.secondCall.args[0].value, 'changelog-{object}.{ext}');
        assert.strictEqual(vscodeMock.window.showInputBox.thirdCall.args[0].value, 'changeset-{date}-{name}.{ext}');
    });
}); 