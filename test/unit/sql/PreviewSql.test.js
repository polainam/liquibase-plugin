const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        activeTextEditor: null,
        showErrorMessage: sinon.stub(),
        showTextDocument: sinon.stub(),
        withProgress: sinon.stub()
    },
    workspace: {
        openTextDocument: sinon.stub()
    },
    ProgressLocation: {
        Notification: 1
    }
};

// Мок для ExtractorFactory
const extractorFactoryMock = {
    extractChangesetInfoAtCursor: sinon.stub(),
    getAllChangesets: sinon.stub(),
    isYamlFile: sinon.stub(),
    isJsonFile: sinon.stub()
};

// Мок для changelogBuilder
const changelogBuilderMock = {
    buildTempChangelog: sinon.stub()
};

// Мок для liquibaseRunner
const liquibaseRunnerMock = {
    runLiquibase: sinon.stub()
};

// Мок для promptUser
const promptUserMock = {
    promptSelectChangeset: sinon.stub(),
    promptSelectSqlType: sinon.stub()
};

// Мок для sqlProcessor
const sqlProcessorMock = {
    extractChangesetSql: sinon.stub()
};

// Мок для fileOperations
const fileOperationsMock = {
    createTempFile: sinon.stub(),
    deleteFileIfExists: sinon.stub()
};

// Мок для workspaceConfig
const workspaceConfigMock = {
    getLiquibasePropertiesPath: sinon.stub()
};

// Мок для ExtensionCommand
class ExtensionCommandMock {
    constructor() {}
}

// Используем proxyquire для загрузки модуля с нашими моками
const PreviewSql = proxyquire('../../../src/sql/PreviewSql', {
    'vscode': vscodeMock,
    '../ExtensionCommand': ExtensionCommandMock,
    './extractors/ExtractorFactory': extractorFactoryMock,
    './changeloBuilder': changelogBuilderMock,
    './liquibaseRunner': liquibaseRunnerMock,
    './promptUser': promptUserMock,
    './sqlProcessor': sqlProcessorMock,
    '../common/fileOperations': fileOperationsMock,
    '../common/workspaceConfig': workspaceConfigMock
});

describe('PreviewSql', () => {
    let sandbox;
    let previewSql;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем все моки
        Object.values(vscodeMock.window).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(vscodeMock.workspace).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(extractorFactoryMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(changelogBuilderMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(liquibaseRunnerMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(promptUserMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(sqlProcessorMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(fileOperationsMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        Object.values(workspaceConfigMock).forEach(mock => mock && typeof mock.reset === 'function' && mock.reset());
        
        // Создаем экземпляр класса
        previewSql = new PreviewSql();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('getCommandId', () => {
        it('should return the correct command ID', () => {
            assert.strictEqual(previewSql.getCommandId(), 'liquibaseGenerator.generateSql');
        });
    });
    
    describe('execute', () => {
        it('should show error if no active editor', async () => {
            vscodeMock.window.activeTextEditor = null;
            
            await previewSql.execute();
            
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(
                vscodeMock.window.showErrorMessage.firstCall.args[0],
                'Please open a changelog file with changesets'
            );
        });
        
        it('should show error if no changesets found', async () => {
            // Мокируем активный редактор
            vscodeMock.window.activeTextEditor = {
                document: {
                    getText: () => 'content',
                    uri: { fsPath: '/path/to/file.xml' }
                },
                selection: { active: {} }
            };
            
            // Мокируем getAllChangesets для возврата пустого массива
            extractorFactoryMock.getAllChangesets.resolves([]);
            
            await previewSql.execute();
            
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(
                vscodeMock.window.showErrorMessage.firstCall.args[0],
                'No changesets found in the current file'
            );
        });
        
        it('should handle error if liquibase.properties not found', async () => {
            // Мокируем активный редактор
            vscodeMock.window.activeTextEditor = {
                document: {
                    getText: () => 'content',
                    uri: { fsPath: '/path/to/file.xml' },
                    offsetAt: () => 10
                },
                selection: { active: {} }
            };
            
            // Мокируем getAllChangesets
            const changesets = [{ id: '1', author: 'author1' }];
            extractorFactoryMock.getAllChangesets.resolves(changesets);
            
            // Мокируем выбор changeset
            promptUserMock.promptSelectChangeset.resolves(changesets[0]);
            
            // Мокируем выбор типа SQL
            promptUserMock.promptSelectSqlType.resolves({ label: 'Short SQL' });
            
            // Мокируем withProgress для выполнения callback
            vscodeMock.window.withProgress.callsFake((options, callback) => callback());
            
            // Мокируем buildTempChangelog
            changelogBuilderMock.buildTempChangelog.resolves({
                tempContent: 'temp content',
                extension: '.xml'
            });
            
            // Мокируем createTempFile
            fileOperationsMock.createTempFile.returns('/path/to/temp.xml');
            
            // Мокируем getLiquibasePropertiesPath, возвращаем null
            workspaceConfigMock.getLiquibasePropertiesPath.resolves(null);
            
            await previewSql.execute(false);
            
            // Проверяем, что было показано сообщение об ошибке
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(
                vscodeMock.window.showErrorMessage.firstCall.args[0],
                'Cannot proceed without liquibase.properties'
            );
            
            // Проверяем, что временный файл был удален
            assert.strictEqual(fileOperationsMock.deleteFileIfExists.calledOnce, true);
        });
    });
}); 