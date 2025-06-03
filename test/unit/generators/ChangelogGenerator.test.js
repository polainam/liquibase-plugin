const sinon = require('sinon');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const proxyquire = require('proxyquire').noCallThru();

// Import the vscode mock
const vscodeMock = require('../mocks/vscode');

// Create mocks for dependencies
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

// Use proxyquire to load the module with our mocks
const ChangelogGenerator = proxyquire('../../../src/generators/ChangelogGenerator', {
    'vscode': vscodeMock,
    '../common/editorView': editorViewMock,
    '../common/textTemplates': textTemplatesMock,
    '../common/fileOperations': fileOperationsMock,
    '../common/workspaceConfig': workspaceConfigMock,
    './utils': utilsMock,
    './templateFactory': templateFactoryMock
});

describe('ChangelogGenerator', () => {
    let sandbox;
    let generator;
    let mockConfig;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Mock configuration
        mockConfig = {
            get: sandbox.stub(),
            update: sandbox.stub().resolves()
        };
        
        // Mock getLiquibaseConfig
        workspaceConfigMock.getLiquibaseConfig.returns(mockConfig);
        
        // Set up default config values
        mockConfig.get.withArgs('defaultChangelogFormat').returns('xml');
        mockConfig.get.withArgs('changelogNamingPattern').returns('changelog-${date}.xml');
        mockConfig.get.withArgs('showRootChangelogWarning').returns(true);
        mockConfig.get.withArgs('mainParentChangelog').returns(null);
        
        // Create generator instance with mock options
        generator = new ChangelogGenerator({
            targetDirectory: '/test/dir'
        });
    });
    
    afterEach(() => {
        sandbox.restore();
        sinon.reset();
    });
    
    describe('getCommandId', () => {
        it('should return the correct command ID', () => {
            assert.strictEqual(generator.getCommandId(), 'liquibaseGenerator.createChangelog');
        });
    });
    
    describe('maybeShowRootWarning', () => {
        it('should show warning when showRootChangelogWarning is true', async () => {
            // Mock vscode.window.showInformationMessage
            vscodeMock.window.showInformationMessage.resolves('OK');
            
            await generator.maybeShowRootWarning();
            
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(mockConfig.update.called, false);
        });
        
        it('should update config when "Don\'t show again" is selected', async () => {
            // Mock vscode.window.showInformationMessage
            vscodeMock.window.showInformationMessage.resolves("Don't show again");
            
            await generator.maybeShowRootWarning();
            
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(mockConfig.update.calledOnce, true);
            assert.deepStrictEqual(mockConfig.update.firstCall.args, ['showRootChangelogWarning', false, true]);
        });
        
        it('should not show warning when showRootChangelogWarning is false', async () => {
            mockConfig.get.withArgs('showRootChangelogWarning').returns(false);
            
            await generator.maybeShowRootWarning();
            
            assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
        });
    });
    
    describe('openChangelogDocuments', () => {
        it('should open files in split view when mainParentChangelog exists and connection succeeds', async () => {
            const mainParentChangelog = '/test/parent.xml';
            const changelogPath = '/test/changelog.xml';
            
            // Mock fs.existsSync
            sandbox.stub(fs, 'existsSync').withArgs(mainParentChangelog).returns(true);
            
            // Mock addToChangelogFile
            utilsMock.addToChangelogFile.resolves(true);
            
            await generator.openChangelogDocuments(mainParentChangelog, changelogPath);
            
            assert.strictEqual(editorViewMock.openFilesInSplitView.calledOnce, true);
            assert.deepStrictEqual(editorViewMock.openFilesInSplitView.firstCall.args, [mainParentChangelog, changelogPath]);
        });
        
        it('should open only the changelog when mainParentChangelog does not exist', async () => {
            const changelogPath = '/test/changelog.xml';
            
            // Mock vscode.workspace.openTextDocument and vscode.window.showTextDocument
            const mockDocument = {};
            const mockEditor = {};
            vscodeMock.workspace.openTextDocument.resolves(mockDocument);
            vscodeMock.window.showTextDocument.resolves(mockEditor);
            
            await generator.openChangelogDocuments(null, changelogPath);
            
            assert.strictEqual(vscodeMock.workspace.openTextDocument.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showTextDocument.calledOnce, true);
            assert.strictEqual(editorViewMock.setCursorToOptimalPosition.calledOnce, true);
            assert.deepStrictEqual(editorViewMock.setCursorToOptimalPosition.firstCall.args, [mockEditor]);
        });
    });
    
    describe('execute', () => {
        it('should generate a changelog file and return the path when successful', async () => {
            const targetDir = '/test/dir';
            const filename = 'changelog-20230101.xml';
            const changelogPath = path.join(targetDir, filename);
            const templateContent = '<?xml version="1.0" encoding="UTF-8"?>';
            
            // Mock getInitialVariables
            textTemplatesMock.getInitialVariables.returns({ date: '20230101' });
            
            // Mock gatherVariableValues
            textTemplatesMock.gatherVariableValues.resolves({ date: '20230101' });
            
            // Mock formatFilename
            fileOperationsMock.formatFilename.returns(filename);
            
            // Mock getTemplate
            templateFactoryMock.getTemplate.returns(templateContent);
            
            // Mock writeFile
            fileOperationsMock.writeFile.resolves();
            
            // Mock openChangelogDocuments
            sandbox.stub(generator, 'openChangelogDocuments').resolves();
            
            // Mock maybeShowRootWarning
            sandbox.stub(generator, 'maybeShowRootWarning').resolves();
            
            const result = await generator.execute();
            
            assert.strictEqual(result, changelogPath);
        });
        
        it('should return null when gatherVariableValues returns null', async () => {
            // Mock getInitialVariables
            textTemplatesMock.getInitialVariables.returns({});
            
            // Mock gatherVariableValues to return null (user canceled)
            textTemplatesMock.gatherVariableValues.resolves(null);
            
            const result = await generator.execute();
            
            assert.strictEqual(result, null);
        });
        
        it('should handle errors and show error message', async () => {
            const error = new Error('Test error');
            
            // Mock getInitialVariables to throw an error
            textTemplatesMock.getInitialVariables.throws(error);
            
            // Mock console.error
            sandbox.stub(console, 'error');
            
            const result = await generator.execute();
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], `Failed to generate changelog: ${error.message}`);
        });
    });
}); 