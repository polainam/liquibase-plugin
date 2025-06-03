const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

// Создаем моки для зависимостей
const ChangelogGeneratorMock = sinon.stub();
const ChangesetGeneratorMock = sinon.stub();
const SetupWizardMock = sinon.stub();
const PreviewSqlMock = sinon.stub();

// Создаем экземпляры моков
const changelogGeneratorInstance = {};
const changesetGeneratorInstance = {};
const setupWizardInstance = {};
const previewSqlInstance = {};

describe('index', () => {
    let index;
    
    beforeEach(() => {
        // Сбрасываем моки
        ChangelogGeneratorMock.reset();
        ChangesetGeneratorMock.reset();
        SetupWizardMock.reset();
        PreviewSqlMock.reset();
        
        // Настраиваем моки для возврата экземпляров
        ChangelogGeneratorMock.returns(changelogGeneratorInstance);
        ChangesetGeneratorMock.returns(changesetGeneratorInstance);
        SetupWizardMock.returns(setupWizardInstance);
        PreviewSqlMock.returns(previewSqlInstance);
        
        // Загружаем модуль с моками
        index = proxyquire('../../src/index', {
            './generators/ChangelogGenerator': ChangelogGeneratorMock,
            './generators/ChangesetGenerator': ChangesetGeneratorMock,
            './wizard/SetupWizard': SetupWizardMock,
            './sql/PreviewSql': PreviewSqlMock
        });
    });
    
    it('should create instances of all commands', () => {
        // Проверяем, что все конструкторы были вызваны
        assert.strictEqual(ChangelogGeneratorMock.calledOnce, true);
        assert.strictEqual(ChangesetGeneratorMock.calledOnce, true);
        assert.strictEqual(SetupWizardMock.calledOnce, true);
        assert.strictEqual(PreviewSqlMock.calledOnce, true);
        
        // Проверяем, что ChangelogGenerator и ChangesetGenerator были вызваны с пустым объектом
        assert.deepStrictEqual(ChangelogGeneratorMock.firstCall.args[0], {});
        assert.deepStrictEqual(ChangesetGeneratorMock.firstCall.args[0], {});
    });
    
    it('should export commands array with all instances', () => {
        // Проверяем, что экспортируется массив команд
        assert.strictEqual(Array.isArray(index.commands), true);
        assert.strictEqual(index.commands.length, 4);
        
        // Проверяем, что массив содержит все экземпляры
        assert.strictEqual(index.commands[0], changelogGeneratorInstance);
        assert.strictEqual(index.commands[1], changesetGeneratorInstance);
        assert.strictEqual(index.commands[2], setupWizardInstance);
        assert.strictEqual(index.commands[3], previewSqlInstance);
    });
}); 