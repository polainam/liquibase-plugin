const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showQuickPick: sinon.stub()
    }
};

// Используем proxyquire для загрузки модуля с нашими моками
const { promptSelectChangeset, promptSelectSqlType } = proxyquire('../../../src/sql/promptUser', {
    'vscode': vscodeMock
});

describe('promptUser', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        vscodeMock.window.showQuickPick.reset();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('promptSelectChangeset', () => {
        it('should format changesets and call showQuickPick', async () => {
            const changesets = [
                { id: '1', author: 'author1' },
                { id: '2', author: 'author2', label: 'Custom Label' }
            ];
            
            const expectedPicks = [
                { label: '1', description: 'Author: author1', changeset: changesets[0] },
                { label: 'Custom Label', description: 'Author: author2', changeset: changesets[1] }
            ];
            
            vscodeMock.window.showQuickPick.resolves(expectedPicks[0]);
            
            const result = await promptSelectChangeset(changesets);
            
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.deepStrictEqual(vscodeMock.window.showQuickPick.firstCall.args[0], expectedPicks);
            assert.deepStrictEqual(result, changesets[0]);
        });
    });
    
    describe('promptSelectSqlType', () => {
        it('should show SQL type options with changeset info', async () => {
            const changesetInfo = { id: '1', author: 'author1' };
            
            const expectedOptions = [
                { label: 'Full SQL', description: 'Generate complete SQL including all Liquibase operations' },
                { label: 'Short SQL', description: 'Generate only the SQL specific to this changeset' }
            ];
            
            vscodeMock.window.showQuickPick.resolves(expectedOptions[0]);
            
            const result = await promptSelectSqlType(changesetInfo);
            
            assert.strictEqual(vscodeMock.window.showQuickPick.calledOnce, true);
            assert.deepStrictEqual(vscodeMock.window.showQuickPick.firstCall.args[0], expectedOptions);
            assert.deepStrictEqual(vscodeMock.window.showQuickPick.firstCall.args[1], {
                placeHolder: 'Select SQL type for changeset ID: 1 by author1'
            });
            assert.deepStrictEqual(result, expectedOptions[0]);
        });
    });
}); 