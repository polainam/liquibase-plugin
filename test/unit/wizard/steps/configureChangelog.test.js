const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showQuickPick: sinon.stub(),
        showOpenDialog: sinon.stub(),
        showInformationMessage: sinon.stub()
    }
};

// Мок для path
const pathMock = {
    basename: sinon.stub()
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

describe('configureChangelog', () => {
    let sandbox;
    let configureChangelogModule;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showQuickPick.reset();
        vscodeMock.window.showOpenDialog.reset();
        vscodeMock.window.showInformationMessage.reset();
        pathMock.basename.reset();
        workspaceConfigMock.getLiquibaseConfig.reset();
        configMock.get.reset();
        configMock.update.reset();
        
        // Настраиваем стандартное поведение моков
        workspaceConfigMock.getLiquibaseConfig.returns(configMock);
        configMock.update.resolves();
        pathMock.basename.callsFake(path => path.split(/[\/\\]/).pop());
        
        // Загружаем модуль с нашими моками
        configureChangelogModule = proxyquire('../../../../src/wizard/steps/configureChangelog', {
            'vscode': vscodeMock,
            'path': pathMock,
            '../../common/workspaceConfig': workspaceConfigMock
        });
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('configureMainParentChangelog', () => {
        it('should update configuration with selected changelog file', async () => {
            const parentChangelog = '/path/to/changelog.xml';
            configMock.get.withArgs('mainParentChangelog').returns('');
            vscodeMock.window.showQuickPick.resolves({ label: 'Yes' });
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: parentChangelog }]);
            
            const result = await configureChangelogModule.configureMainParentChangelog();
            
            assert.strictEqual(result, parentChangelog);
            assert.strictEqual(configMock.update.calledTwice, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, ['mainParentChangelog', parentChangelog, true]);
            assert.deepStrictEqual(configMock.update.secondCall.args, ['showRootChangelogWarning', false, true]);
        });
        
        it('should clear configuration if user chooses not to set up parent changelog', async () => {
            const currentChangelog = '/path/to/existing/changelog.xml';
            configMock.get.withArgs('mainParentChangelog').returns(currentChangelog);
            vscodeMock.window.showQuickPick.resolves({ label: 'No' });
            
            const result = await configureChangelogModule.configureMainParentChangelog();
            
            assert.strictEqual(result, '');
            assert.strictEqual(configMock.update.calledTwice, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, ['mainParentChangelog', '', true]);
            assert.deepStrictEqual(configMock.update.secondCall.args, ['showRootChangelogWarning', true, true]);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
        });
        
        it('should update configuration if current value is empty and user chooses not to set up', async () => {
            configMock.get.withArgs('mainParentChangelog').returns('');
            vscodeMock.window.showQuickPick.resolves({ label: 'No' });
            
            const result = await configureChangelogModule.configureMainParentChangelog();
            
            assert.strictEqual(result, '');
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(configMock.update.calledOnce, true);
            assert.deepStrictEqual(configMock.update.firstCall.args, ['showRootChangelogWarning', true, true]);
        });
        
        it('should return null if user cancels quick pick', async () => {
            configMock.get.withArgs('mainParentChangelog').returns('');
            vscodeMock.window.showQuickPick.resolves(null);
            
            const result = await configureChangelogModule.configureMainParentChangelog();
            
            assert.strictEqual(result, null);
            assert.strictEqual(configMock.update.called, false);
        });
        
        it('should return empty string if user cancels file selection', async () => {
            configMock.get.withArgs('mainParentChangelog').returns('');
            vscodeMock.window.showQuickPick.resolves({ label: 'Yes' });
            vscodeMock.window.showOpenDialog.resolves(null);
            
            const result = await configureChangelogModule.configureMainParentChangelog();
            
            assert.strictEqual(result, '');
            assert.strictEqual(configMock.update.called, false);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
        });
    });
    
    describe('configureFolderChangelog', () => {
        it('should update folder mappings with selected folder and changelog', async () => {
            const folderPath = '/path/to/folder';
            const changelogPath = '/path/to/changelog.xml';
            const existingMappings = { '/other/folder': '/other/changelog.xml' };
            
            configMock.get.withArgs('folderChangelogMappings').returns(existingMappings);
            vscodeMock.window.showOpenDialog.onFirstCall().resolves([{ fsPath: folderPath }]);
            vscodeMock.window.showOpenDialog.onSecondCall().resolves([{ fsPath: changelogPath }]);
            pathMock.basename.withArgs(folderPath).returns('folder');
            pathMock.basename.withArgs(changelogPath).returns('changelog.xml');
            
            const result = await configureChangelogModule.configureFolderChangelog();
            
            assert.deepStrictEqual(result, {
                folderPath,
                changelogPath,
                message: 'Folder changelog configured: changesets in "folder" will be connected to changelog.xml'
            });
            
            assert.strictEqual(configMock.update.calledOnce, true);
            const expectedMappings = { ...existingMappings, [folderPath]: changelogPath };
            assert.deepStrictEqual(configMock.update.firstCall.args, ['folderChangelogMappings', expectedMappings, true]);
        });
        
        it('should create new mappings object if none exists', async () => {
            const folderPath = '/path/to/folder';
            const changelogPath = '/path/to/changelog.xml';
            
            configMock.get.withArgs('folderChangelogMappings').returns(undefined);
            vscodeMock.window.showOpenDialog.onFirstCall().resolves([{ fsPath: folderPath }]);
            vscodeMock.window.showOpenDialog.onSecondCall().resolves([{ fsPath: changelogPath }]);
            pathMock.basename.withArgs(folderPath).returns('folder');
            pathMock.basename.withArgs(changelogPath).returns('changelog.xml');
            
            const result = await configureChangelogModule.configureFolderChangelog();
            
            assert.strictEqual(configMock.update.calledOnce, true);
            const expectedMappings = { [folderPath]: changelogPath };
            assert.deepStrictEqual(configMock.update.firstCall.args, ['folderChangelogMappings', expectedMappings, true]);
        });
    });
});