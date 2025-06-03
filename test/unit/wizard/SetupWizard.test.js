const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showInformationMessage: sinon.stub(),
        showWarningMessage: sinon.stub(),
        showErrorMessage: sinon.stub()
    }
};

// Моки для шагов мастера настройки
const configurePropertiesPathMock = sinon.stub();
const configureMainParentChangelogMock = sinon.stub();
const configureDefaultFormatsMock = sinon.stub();
const configureNamingPatternsMock = sinon.stub();
const configureAuthorMock = sinon.stub();

const configureChangelogMock = {
    configureMainParentChangelog: configureMainParentChangelogMock
};

// Используем proxyquire для загрузки модуля с нашими моками
const SetupWizard = proxyquire('../../../src/wizard/SetupWizard', {
    'vscode': vscodeMock,
    './steps/configurePropertiesPath': configurePropertiesPathMock,
    './steps/configureChangelog': configureChangelogMock,
    './steps/configureDefaultFormats': configureDefaultFormatsMock,
    './steps/configureNamingPatterns': configureNamingPatternsMock,
    './steps/configureAuthor': configureAuthorMock
});

describe('SetupWizard', () => {
    let wizard;
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        wizard = new SetupWizard();
        
        // Сбрасываем моки
        vscodeMock.window.showInformationMessage.reset();
        vscodeMock.window.showWarningMessage.reset();
        vscodeMock.window.showErrorMessage.reset();
        configurePropertiesPathMock.reset();
        configureMainParentChangelogMock.reset();
        configureDefaultFormatsMock.reset();
        configureNamingPatternsMock.reset();
        configureAuthorMock.reset();
        
        // Настраиваем стандартное поведение моков
        configurePropertiesPathMock.resolves('/path/to/liquibase.properties');
        configureMainParentChangelogMock.resolves('/path/to/changelog.xml');
        configureDefaultFormatsMock.resolves({ changelog: 'xml', changeset: 'xml' });
        configureNamingPatternsMock.resolves({ changelog: 'changelog-${timestamp}.xml', changeset: 'changeset-${timestamp}.xml' });
        configureAuthorMock.resolves('testAuthor');
        vscodeMock.window.showInformationMessage.resolves('Start');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('execute', () => {
        it('should complete all steps successfully', async () => {
            await wizard.execute();
            
            // Проверяем, что все шаги были вызваны
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledTwice, true);
            assert.strictEqual(configurePropertiesPathMock.calledOnce, true);
            assert.strictEqual(configureMainParentChangelogMock.calledOnce, true);
            assert.strictEqual(configureDefaultFormatsMock.calledOnce, true);
            assert.strictEqual(configureNamingPatternsMock.calledOnce, true);
            assert.strictEqual(configureAuthorMock.calledOnce, true);
            
            // Проверяем, что показано сообщение об успешном завершении
            assert.strictEqual(
                vscodeMock.window.showInformationMessage.secondCall.args[0],
                'Liquibase Plugin setup completed successfully! You can modify any settings later through the "Liquibase: Plugin Settings".'
            );
        });
        
        it('should exit if user cancels at welcome screen', async () => {
            vscodeMock.window.showInformationMessage.resolves('Cancel');
            
            await wizard.execute();
            
            // Проверяем, что шаги не были вызваны
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(configurePropertiesPathMock.called, false);
            assert.strictEqual(configureMainParentChangelogMock.called, false);
            assert.strictEqual(configureDefaultFormatsMock.called, false);
            assert.strictEqual(configureNamingPatternsMock.called, false);
            assert.strictEqual(configureAuthorMock.called, false);
        });
        
        it('should show warning if user cancels during a step', async () => {
            configurePropertiesPathMock.resolves(null);
            
            await wizard.execute();
            
            // Проверяем, что был вызван только первый шаг
            assert.strictEqual(configurePropertiesPathMock.calledOnce, true);
            assert.strictEqual(configureMainParentChangelogMock.called, false);
            
            // Проверяем, что показано предупреждение
            assert.strictEqual(vscodeMock.window.showWarningMessage.calledOnce, true);
            assert.strictEqual(
                vscodeMock.window.showWarningMessage.firstCall.args[0],
                'Setup wizard was canceled during "Properties Path". You can run it again later via "Liquibase: Plugin Settings".'
            );
        });
        
        it('should handle errors during execution', async () => {
            const error = new Error('Test error');
            configurePropertiesPathMock.rejects(error);
            
            await wizard.execute();
            
            // Проверяем, что показано сообщение об ошибке
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(
                vscodeMock.window.showErrorMessage.firstCall.args[0],
                'Setup failed: Test error'
            );
        });
    });
}); 