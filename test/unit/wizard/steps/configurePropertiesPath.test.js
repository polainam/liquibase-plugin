const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showInformationMessage: sinon.stub(),
        showOpenDialog: sinon.stub()
    }
};

// Мок для fs
const fsMock = {
    existsSync: sinon.stub()
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
const configurePropertiesPath = proxyquire('../../../../src/wizard/steps/configurePropertiesPath', {
    'vscode': vscodeMock,
    'fs': fsMock,
    '../../common/workspaceConfig': workspaceConfigMock
});

describe('configurePropertiesPath', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showInformationMessage.reset();
        vscodeMock.window.showOpenDialog.reset();
        fsMock.existsSync.reset();
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
    
    it('should use existing properties path if file exists and user chooses to keep it', async () => {
        const existingPath = '/path/to/existing/liquibase.properties';
        configMock.get.withArgs('propertiesPath').returns(existingPath);
        fsMock.existsSync.withArgs(existingPath).returns(true);
        vscodeMock.window.showInformationMessage.resolves('No, keep current file');
        
        const result = await configurePropertiesPath();
        
        assert.strictEqual(result, existingPath);
        assert.strictEqual(vscodeMock.window.showOpenDialog.called, false);
        assert.strictEqual(configMock.update.called, false);
    });
    
    it('should prompt to select new file if existing file exists but user chooses to change', async () => {
        const existingPath = '/path/to/existing/liquibase.properties';
        const newPath = '/path/to/new/liquibase.properties';
        configMock.get.withArgs('propertiesPath').returns(existingPath);
        fsMock.existsSync.withArgs(existingPath).returns(true);
        vscodeMock.window.showInformationMessage.resolves('Yes, change file');
        vscodeMock.window.showOpenDialog.resolves([{ fsPath: newPath }]);
        
        const result = await configurePropertiesPath();
        
        assert.strictEqual(result, newPath);
        assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
        assert.strictEqual(configMock.update.calledOnce, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['propertiesPath', newPath, true]);
    });
    
    it('should prompt to select file if no existing path is configured', async () => {
        const newPath = '/path/to/new/liquibase.properties';
        configMock.get.withArgs('propertiesPath').returns(undefined);
        vscodeMock.window.showOpenDialog.resolves([{ fsPath: newPath }]);
        
        const result = await configurePropertiesPath();
        
        assert.strictEqual(result, newPath);
        assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
        assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
        assert.strictEqual(configMock.update.calledOnce, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['propertiesPath', newPath, true]);
    });
    
    it('should prompt to select file if existing path is configured but file does not exist', async () => {
        const existingPath = '/path/to/nonexistent/liquibase.properties';
        const newPath = '/path/to/new/liquibase.properties';
        configMock.get.withArgs('propertiesPath').returns(existingPath);
        fsMock.existsSync.withArgs(existingPath).returns(false);
        vscodeMock.window.showOpenDialog.resolves([{ fsPath: newPath }]);
        
        const result = await configurePropertiesPath();
        
        assert.strictEqual(result, newPath);
        assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
        assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
        assert.strictEqual(configMock.update.calledOnce, true);
        assert.deepStrictEqual(configMock.update.firstCall.args, ['propertiesPath', newPath, true]);
    });
}); 