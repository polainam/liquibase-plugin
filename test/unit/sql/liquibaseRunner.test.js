const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для child_process
const cpMock = {
    exec: sinon.stub()
};

// Мок для liquibaseCommands
const liquibaseCommandsMock = {
    createLiquibaseCommand: sinon.stub()
};

// Используем proxyquire для загрузки модуля с нашими моками
const { runLiquibase } = proxyquire('../../../src/sql/liquibaseRunner', {
    'child_process': cpMock,
    '../common/liquibaseCommands': liquibaseCommandsMock
});

describe('liquibaseRunner', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        cpMock.exec.reset();
        liquibaseCommandsMock.createLiquibaseCommand.reset();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('runLiquibase', () => {
        it('should execute liquibase command and return stdout on success', async () => {
            const propertiesPath = '/path/to/liquibase.properties';
            const tempFilePath = '/path/to/temp.xml';
            const workspaceFolder = '/workspace';
            const liquibaseCommand = 'liquibase --changeLogFile=temp.xml updateSQL';
            const expectedOutput = 'SQL output';
            
            liquibaseCommandsMock.createLiquibaseCommand.returns(liquibaseCommand);
            
            // Мокируем exec для успешного выполнения
            cpMock.exec.callsFake((cmd, options, callback) => {
                callback(null, expectedOutput, '');
            });
            
            const result = await runLiquibase(propertiesPath, tempFilePath, workspaceFolder);
            
            assert.strictEqual(liquibaseCommandsMock.createLiquibaseCommand.calledOnce, true);
            assert.deepStrictEqual(
                liquibaseCommandsMock.createLiquibaseCommand.firstCall.args,
                [propertiesPath, tempFilePath, workspaceFolder]
            );
            
            assert.strictEqual(cpMock.exec.calledOnce, true);
            assert.strictEqual(cpMock.exec.firstCall.args[0], liquibaseCommand);
            assert.deepStrictEqual(cpMock.exec.firstCall.args[1], { cwd: workspaceFolder });
            
            assert.strictEqual(result, expectedOutput);
        });
        
        it('should use error message from error object if stderr is empty', async () => {
            const propertiesPath = '/path/to/liquibase.properties';
            const tempFilePath = '/path/to/temp.xml';
            const workspaceFolder = '/workspace';
            const liquibaseCommand = 'liquibase --changeLogFile=temp.xml updateSQL';
            const errorMessage = 'Command failed';
            
            liquibaseCommandsMock.createLiquibaseCommand.returns(liquibaseCommand);
            
            // Мокируем exec для ошибки без stderr
            cpMock.exec.callsFake((cmd, options, callback) => {
                const error = new Error(errorMessage);
                callback(error, '', '');
            });
            
            await assert.rejects(
                () => runLiquibase(propertiesPath, tempFilePath, workspaceFolder),
                { message: errorMessage }
            );
        });
    });
}); 