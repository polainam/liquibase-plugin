const sinon = require('sinon');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();

// Импортируем обновленный мок vscode
const vscodeMock = require('../mocks/vscode');

// Создаем моки для зависимостей
const utilsMock = {
    addToChangelogFile: sinon.stub()
};

const templateFactoryMock = {
    getTemplate: sinon.stub()
};

const editorViewMock = {
    openFilesInSplitView: sinon.stub(),
    setCursorToOptimalPosition: sinon.stub()
};

const textTemplatesMock = {
    gatherVariableValues: sinon.stub(),
    getInitialVariables: sinon.stub()
};

const fileOperationsMock = {
    formatFilename: sinon.stub(),
    writeFile: sinon.stub()
};

const workspaceConfigMock = {
    getLiquibaseConfig: sinon.stub()
};

// Используем proxyquire для загрузки модуля с нашими моками
const ChangesetGenerator = proxyquire('../../../src/generators/ChangesetGenerator', {
    'vscode': vscodeMock,
    '../common/editorView': editorViewMock,
    '../common/textTemplates': textTemplatesMock,
    '../common/fileOperations': fileOperationsMock,
    '../common/workspaceConfig': workspaceConfigMock,
    './utils': utilsMock,
    './templateFactory': templateFactoryMock
});

describe('ChangesetGenerator', () => {
    let sandbox;
    let generator;
    let mockConfig;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Мокируем конфигурацию
        mockConfig = {
            get: sandbox.stub(),
            update: sandbox.stub().resolves()
        };
        
        // Мокируем getLiquibaseConfig
        workspaceConfigMock.getLiquibaseConfig.returns(mockConfig);
        
        // Устанавливаем значения конфигурации по умолчанию
        mockConfig.get.withArgs('defaultChangesetFormat').returns('xml');
        mockConfig.get.withArgs('changesetNamingPattern').returns('changeset-${date}-${author}.xml');
        
        // Создаем экземпляр генератора с тестовыми опциями
        generator = new ChangesetGenerator({
            targetDirectory: '/test/dir'
        });

        // Сбрасываем все стабы
        utilsMock.addToChangelogFile.reset();
        templateFactoryMock.getTemplate.reset();
        editorViewMock.openFilesInSplitView.reset();
        editorViewMock.setCursorToOptimalPosition.reset();
        textTemplatesMock.gatherVariableValues.reset();
        textTemplatesMock.getInitialVariables.reset();
        fileOperationsMock.formatFilename.reset();
        fileOperationsMock.writeFile.reset();
        
        // Сбрасываем моки vscode
        Object.values(vscodeMock.window).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.workspace).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.commands).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('getCommandId', () => {
        it('should return the correct command ID', () => {
            assert.strictEqual(generator.getCommandId(), 'liquibaseGenerator.createChangeset');
        });
    });
    
    describe('execute', () => {
        it('should generate a changeset file and return the path when successful', async () => {
            const targetDir = '/test/dir';
            const filename = 'changeset-20230101-testuser.xml';
            const changesetPath = path.join(targetDir, filename);
            const templateContent = '<?xml version="1.0" encoding="UTF-8"?>';
            
            // Мокируем getInitialVariables
            textTemplatesMock.getInitialVariables.returns({ date: '20230101', author: 'testuser' });
            
            // Мокируем gatherVariableValues
            textTemplatesMock.gatherVariableValues.resolves({ date: '20230101', author: 'testuser' });
            
            // Мокируем formatFilename
            fileOperationsMock.formatFilename.returns(filename);
            
            // Мокируем getTemplate
            templateFactoryMock.getTemplate.returns(templateContent);
            
            // Мокируем writeFile
            fileOperationsMock.writeFile.resolves();
            
            // Мокируем tryToConnectToChangelog
            sandbox.stub(generator, 'tryToConnectToChangelog').resolves(false);
            
            // Мокируем vscode.workspace.openTextDocument и vscode.window.showTextDocument
            const mockDocument = {};
            const mockEditor = {};
            vscodeMock.workspace.openTextDocument.resolves(mockDocument);
            vscodeMock.window.showTextDocument.resolves(mockEditor);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, changesetPath);
            assert.strictEqual(vscodeMock.workspace.openTextDocument.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showTextDocument.calledOnce, true);
            assert.strictEqual(editorViewMock.setCursorToOptimalPosition.calledOnce, true);
            assert.deepStrictEqual(templateFactoryMock.getTemplate.firstCall.args, ['xml', 'changeset', { id: filename, author: 'testuser' }]);
        });
        
        it('should return null when gatherVariableValues returns null', async () => {
            // Мокируем getInitialVariables
            textTemplatesMock.getInitialVariables.returns({});
            
            // Мокируем gatherVariableValues чтобы вернуть null (пользователь отменил)
            textTemplatesMock.gatherVariableValues.resolves(null);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, null);
        });
        
        it('should handle errors and show error message', async () => {
            const error = new Error('Test error');
            
            // Мокируем getInitialVariables чтобы выбросить ошибку
            textTemplatesMock.getInitialVariables.throws(error);
            
            // Мокируем console.error
            sandbox.stub(console, 'error');
            
            const result = await generator.execute();
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], `Failed to generate changeset: ${error.message}`);
        });
        
        it('should connect to changelog and return the path when connection is successful', async () => {
            const targetDir = '/test/dir';
            const filename = 'changeset-20230101-testuser.xml';
            const changesetPath = path.join(targetDir, filename);
            const templateContent = '<?xml version="1.0" encoding="UTF-8"?>';
            
            // Мокируем getInitialVariables
            textTemplatesMock.getInitialVariables.returns({ date: '20230101', author: 'testuser' });
            
            // Мокируем gatherVariableValues
            textTemplatesMock.gatherVariableValues.resolves({ date: '20230101', author: 'testuser' });
            
            // Мокируем formatFilename
            fileOperationsMock.formatFilename.returns(filename);
            
            // Мокируем getTemplate
            templateFactoryMock.getTemplate.returns(templateContent);
            
            // Мокируем writeFile
            fileOperationsMock.writeFile.resolves();
            
            // Мокируем tryToConnectToChangelog
            sandbox.stub(generator, 'tryToConnectToChangelog').resolves(true);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, changesetPath);
            assert.strictEqual(vscodeMock.workspace.openTextDocument.called, false);
            assert.strictEqual(vscodeMock.window.showTextDocument.called, false);
        });

        it('should use format from config', async () => {
            // Устанавливаем значение конфигурации для формата
            mockConfig.get.withArgs('defaultChangesetFormat').returns('yaml');
            
            const targetDir = '/test/dir';
            const filename = 'changeset-20230101-testuser.yaml';
            const changesetPath = path.join(targetDir, filename);
            const templateContent = 'databaseChangeLog:';
            
            // Мокируем getInitialVariables
            textTemplatesMock.getInitialVariables.returns({ date: '20230101', author: 'testuser' });
            
            // Мокируем gatherVariableValues
            textTemplatesMock.gatherVariableValues.resolves({ date: '20230101', author: 'testuser' });
            
            // Мокируем formatFilename
            fileOperationsMock.formatFilename.returns(filename);
            
            // Мокируем getTemplate
            templateFactoryMock.getTemplate.returns(templateContent);
            
            // Мокируем writeFile
            fileOperationsMock.writeFile.resolves();
            
            // Мокируем tryToConnectToChangelog
            sandbox.stub(generator, 'tryToConnectToChangelog').resolves(false);
            
            // Мокируем vscode.workspace.openTextDocument и vscode.window.showTextDocument
            const mockDocument = {};
            const mockEditor = {};
            vscodeMock.workspace.openTextDocument.resolves(mockDocument);
            vscodeMock.window.showTextDocument.resolves(mockEditor);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, changesetPath);
            assert.deepStrictEqual(templateFactoryMock.getTemplate.firstCall.args[0], 'yaml');
            assert.deepStrictEqual(templateFactoryMock.getTemplate.firstCall.args[1], 'changeset');
        });

        it('should use author from options if provided', async () => {
            // Создаем экземпляр генератора с опцией author
            generator = new ChangesetGenerator({
                targetDirectory: '/test/dir',
                author: 'custom-author'
            });

            const targetDir = '/test/dir';
            const filename = 'changeset-20230101-custom-author.xml';
            const changesetPath = path.join(targetDir, filename);
            const templateContent = '<?xml version="1.0" encoding="UTF-8"?>';
            
            // Мокируем getInitialVariables
            textTemplatesMock.getInitialVariables.returns({ date: '20230101', author: 'testuser' });
            
            // Мокируем gatherVariableValues
            textTemplatesMock.gatherVariableValues.resolves({ date: '20230101', author: 'custom-author' });
            
            // Мокируем formatFilename
            fileOperationsMock.formatFilename.returns(filename);
            
            // Мокируем getTemplate
            templateFactoryMock.getTemplate.returns(templateContent);
            
            // Мокируем writeFile
            fileOperationsMock.writeFile.resolves();
            
            // Мокируем tryToConnectToChangelog
            sandbox.stub(generator, 'tryToConnectToChangelog').resolves(false);
            
            // Мокируем vscode.workspace.openTextDocument и vscode.window.showTextDocument
            const mockDocument = {};
            const mockEditor = {};
            vscodeMock.workspace.openTextDocument.resolves(mockDocument);
            vscodeMock.window.showTextDocument.resolves(mockEditor);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, changesetPath);
            assert.deepStrictEqual(templateFactoryMock.getTemplate.firstCall.args, ['xml', 'changeset', { id: filename, author: 'custom-author' }]);
        });
    });
    
    describe('tryToConnectToChangelog', () => {
        it('should connect to associated changelog from folder mappings', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            const associatedChangelog = '/test/changelog.xml';
            
            // Мокируем folderMappings
            mockConfig.get.withArgs('folderChangelogMappings').returns({ '/test/dir': associatedChangelog });
            
            // Мокируем fs.existsSync
            sandbox.stub(fs, 'existsSync').withArgs(associatedChangelog).returns(true);
            
            // Мокируем addToChangelogFile
            utilsMock.addToChangelogFile.resolves(true);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, true);
            assert.strictEqual(utilsMock.addToChangelogFile.calledOnce, true);
            assert.deepStrictEqual(utilsMock.addToChangelogFile.firstCall.args[0], associatedChangelog);
            assert.deepStrictEqual(utilsMock.addToChangelogFile.firstCall.args[1], changesetPath);
            assert.strictEqual(editorViewMock.openFilesInSplitView.calledOnce, true);
            assert.deepStrictEqual(editorViewMock.openFilesInSplitView.firstCall.args, [associatedChangelog, changesetPath]);
        });
        
        it('should not connect when user chooses not to connect', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.resolves({ label: 'No', description: 'Keep this changeset standalone' });
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, false);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.called, false);
        });
        
        it('should not connect when user cancels the quick pick', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя (отменен)
            vscodeMock.window.showQuickPick.resolves(null);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, false);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.called, false);
        });
        
        it('should not connect when user cancels file selection', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.resolves({ label: 'Yes', description: 'Connect this changeset to a changelog' });
            
            // Мокируем выбор файла (отменен)
            vscodeMock.window.showOpenDialog.resolves(null);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, false);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
        });
        
        it('should connect to selected changelog and remember preference', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            const selectedChangelog = '/test/selected-changelog.xml';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.onFirstCall().resolves({ label: 'Yes', description: 'Connect this changeset to a changelog' });
            vscodeMock.window.showQuickPick.onSecondCall().resolves({ label: 'Yes', description: 'Connect all future changesets from this folder' });
            
            // Мокируем выбор файла
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: selectedChangelog }]);
            
            // Мокируем addToChangelogFile
            utilsMock.addToChangelogFile.resolves(true);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, true);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledTwice, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(utilsMock.addToChangelogFile.calledOnce, true);
            assert.strictEqual(mockConfig.update.calledOnce, true);
            assert.deepStrictEqual(mockConfig.update.firstCall.args[0], 'folderChangelogMappings');
            assert.deepStrictEqual(mockConfig.update.firstCall.args[1], { '/test/dir': selectedChangelog });
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(editorViewMock.openFilesInSplitView.calledOnce, true);
        });
        
        it('should connect to selected changelog without remembering preference', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            const selectedChangelog = '/test/selected-changelog.xml';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.onFirstCall().resolves({ label: 'Yes', description: 'Connect this changeset to a changelog' });
            vscodeMock.window.showQuickPick.onSecondCall().resolves({ label: 'No', description: 'Ask each time' });
            
            // Мокируем выбор файла
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: selectedChangelog }]);
            
            // Мокируем addToChangelogFile
            utilsMock.addToChangelogFile.resolves(true);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, true);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledTwice, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(utilsMock.addToChangelogFile.calledOnce, true);
            assert.strictEqual(mockConfig.update.called, false);
            assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
            assert.strictEqual(editorViewMock.openFilesInSplitView.calledOnce, true);
        });
        
        it('should not connect when addToChangelogFile fails', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            const selectedChangelog = '/test/selected-changelog.xml';
            
            // Мокируем folderMappings (пустой)
            mockConfig.get.withArgs('folderChangelogMappings').returns({});
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.resolves({ label: 'Yes', description: 'Connect this changeset to a changelog' });
            
            // Мокируем выбор файла
            vscodeMock.window.showOpenDialog.resolves([{ fsPath: selectedChangelog }]);
            
            // Мокируем addToChangelogFile (неудача)
            utilsMock.addToChangelogFile.resolves(false);
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            assert.strictEqual(result, false);
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showOpenDialog.calledOnce, true);
            assert.strictEqual(utilsMock.addToChangelogFile.calledOnce, true);
            assert.strictEqual(editorViewMock.openFilesInSplitView.called, false);
        });

        it('should show quick pick when associated changelog does not exist', async () => {
            const changesetPath = '/test/dir/changeset.xml';
            const targetDir = '/test/dir';
            const associatedChangelog = '/test/changelog.xml';
            
            // Мокируем folderMappings
            mockConfig.get.withArgs('folderChangelogMappings').returns({ '/test/dir': associatedChangelog });
            
            // Мокируем fs.existsSync чтобы вернуть false (файл не существует)
            sandbox.stub(fs, 'existsSync').returns(false);
            
            // Мокируем выбор пользователя
            vscodeMock.window.showQuickPick.resolves({ label: 'No', description: 'Keep this changeset standalone' });
            
            const result = await generator.tryToConnectToChangelog(changesetPath, targetDir);
            
            // Должен показать QuickPick и вернуть false, так как пользователь выбрал "No"
            assert.strictEqual(result, false);
            assert.strictEqual(vscodeMock.window.showQuickPick.called, true);
        });
    });
}); 