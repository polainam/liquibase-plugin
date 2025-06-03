const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');

// Моки для зависимостей
const vscodeMock = {
    workspace: {
        getConfiguration: sinon.stub()
    },
    window: {
        showInformationMessage: sinon.stub(),
        showOpenDialog: sinon.stub()
    }
};

const fsMock = {
    existsSync: sinon.stub(),
    statSync: sinon.stub()
};

const configMock = {
    get: sinon.stub(),
    update: sinon.stub()
};

// Загружаем модуль с моками
const workspaceConfig = proxyquire('../../../src/common/workspaceConfig', {
    'vscode': vscodeMock,
    'fs': fsMock
});

describe('workspaceConfig', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.workspace.getConfiguration.reset();
        vscodeMock.window.showInformationMessage.reset();
        vscodeMock.window.showOpenDialog.reset();
        fsMock.existsSync.reset();
        fsMock.statSync.reset();
        configMock.get.reset();
        configMock.update.reset();
        
        // Настраиваем стандартное поведение моков
        vscodeMock.workspace.getConfiguration.returns(configMock);
        configMock.update.resolves();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('getLiquibaseConfig', () => {
        it('should return the liquibaseGenerator configuration', () => {
            const config = workspaceConfig.getLiquibaseConfig();
            
            assert.strictEqual(vscodeMock.workspace.getConfiguration.calledOnce, true);
            assert.strictEqual(vscodeMock.workspace.getConfiguration.firstCall.args[0], 'liquibaseGenerator');
            assert.strictEqual(config, configMock);
        });
    });
    
    describe('getConfigValue', () => {
        it('should get value from config with default', () => {
            const key = 'testKey';
            const defaultValue = 'defaultValue';
            const expectedValue = 'testValue';
            
            configMock.get.withArgs(key, defaultValue).returns(expectedValue);
            
            const result = workspaceConfig.getConfigValue(key, defaultValue);
            
            assert.strictEqual(result, expectedValue);
            assert.strictEqual(configMock.get.calledOnce, true);
            assert.deepStrictEqual(configMock.get.firstCall.args, [key, defaultValue]);
        });
        
        it('should get value from config without default', () => {
            const key = 'testKey';
            const expectedValue = 'testValue';
            
            configMock.get.withArgs(key, null).returns(expectedValue);
            
            const result = workspaceConfig.getConfigValue(key);
            
            assert.strictEqual(result, expectedValue);
            assert.strictEqual(configMock.get.calledOnce, true);
            assert.deepStrictEqual(configMock.get.firstCall.args, [key, null]);
        });
    });
    
    describe('updateConfigValue', () => {
        it('should update config value with global flag', async () => {
            const key = 'testKey';
            const value = 'testValue';
            
            await workspaceConfig.updateConfigValue(key, value);
            
            assert.strictEqual(configMock.update.calledOnce, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, [key, value, true]);
        });
        
        it('should update config value with specified global flag', async () => {
            const key = 'testKey';
            const value = 'testValue';
            const global = false;
            
            await workspaceConfig.updateConfigValue(key, value, global);
            
            assert.strictEqual(configMock.update.calledOnce, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, [key, value, global]);
        });
    });
    
    describe('getLiquibasePropertiesPath', () => {
        it('should return existing properties path', async () => {
            const propertiesPath = '/path/to/liquibase.properties';
            
            configMock.get.withArgs('propertiesPath').returns(propertiesPath);
            fsMock.existsSync.withArgs(propertiesPath).returns(true);
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, propertiesPath);
            assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
        });
        
        it('should prompt to set properties path if not set', async () => {
            const newPropertiesPath = '/path/to/new/liquibase.properties';
            
            configMock.get.withArgs('propertiesPath').returns(null);
            vscodeMock.window.showInformationMessage.resolves('Yes');
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: newPropertiesPath }]);
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, newPropertiesPath);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(configMock.update.calledOnce, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, ['propertiesPath', newPropertiesPath, true]);
        });
        
        it('should prompt to set properties path if path is invalid', async () => {
            const invalidPath = '/path/to/invalid/liquibase.properties';
            const newPropertiesPath = '/path/to/new/liquibase.properties';
            
            configMock.get.withArgs('propertiesPath').returns(invalidPath);
            fsMock.existsSync.withArgs(invalidPath).returns(false);
            vscodeMock.window.showInformationMessage.resolves('Yes');
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: newPropertiesPath }]);
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, newPropertiesPath);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(configMock.update.calledOnce, true);
        });
        
        it('should return null if user declines to set properties path', async () => {
            configMock.get.withArgs('propertiesPath').returns(null);
            vscodeMock.window.showInformationMessage.resolves('No');
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.called, false);
        });
        
        it('should return null if user cancels file selection', async () => {
            configMock.get.withArgs('propertiesPath').returns(null);
            vscodeMock.window.showInformationMessage.resolves('Yes');
            vscodeMock.window.showOpenDialog.resolves(null);
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(configMock.update.called, false);
        });
        
        it('should return null if user selects no files', async () => {
            configMock.get.withArgs('propertiesPath').returns(null);
            vscodeMock.window.showInformationMessage.resolves('Yes');
            vscodeMock.window.showOpenDialog.resolves([]);
            
            const result = await workspaceConfig.getLiquibasePropertiesPath();
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(configMock.update.called, false);
        });
    });
    
    describe('resolveTargetDirectory', () => {
        it('should return directory path if uri is a directory', () => {
            const dirPath = '/path/to/directory';
            const uri = { fsPath: dirPath };
            
            fsMock.statSync.withArgs(dirPath).returns({ isDirectory: () => true });
            
            const result = workspaceConfig.resolveTargetDirectory(uri);
            
            assert.strictEqual(result, dirPath);
        });
        
        it('should return parent directory path if uri is a file', () => {
            const filePath = '/path/to/file.txt';
            const expectedDirPath = '/path/to';
            const uri = { fsPath: filePath };
            
            fsMock.statSync.withArgs(filePath).returns({ isDirectory: () => false });
            
            const result = workspaceConfig.resolveTargetDirectory(uri);
            
            assert.strictEqual(result, expectedDirPath);
        });
        
        it('should return null if uri is not provided', () => {
            const result = workspaceConfig.resolveTargetDirectory(null);
            
            assert.strictEqual(result, null);
        });
        
        it('should return null if uri.fsPath is not provided', () => {
            const result = workspaceConfig.resolveTargetDirectory({});
            
            assert.strictEqual(result, null);
        });
    });
}); 