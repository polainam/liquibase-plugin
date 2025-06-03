const assert = require('assert');
const ExtensionCommand = require('../../src/ExtensionCommand');

describe('ExtensionCommand', () => {
    describe('constructor', () => {
        it('should throw an error when instantiated directly', () => {
            assert.throws(() => {
                new ExtensionCommand();
            }, /ExtensionCommand is an abstract class and cannot be instantiated directly./);
        });

        it('should not throw an error when extended', () => {
            class TestCommand extends ExtensionCommand {}
            
            assert.doesNotThrow(() => {
                new TestCommand();
            });
        });
    });

    describe('abstract methods', () => {
        let testCommand;
        
        beforeEach(() => {
            class TestCommand extends ExtensionCommand {}
            testCommand = new TestCommand();
        });

        it('should throw an error when execute is not implemented', () => {
            assert.throws(() => {
                testCommand.execute();
            }, /execute\(\) must be implemented./);
        });
    });

    describe('implementation', () => {
        it('should allow implementation of getCommandId', () => {
            class TestCommand extends ExtensionCommand {
                getCommandId() {
                    return 'test.command';
                }
            }
            
            const testCommand = new TestCommand();
            assert.strictEqual(testCommand.getCommandId(), 'test.command');
        });

        it('should allow implementation of execute', () => {
            class TestCommand extends ExtensionCommand {
                execute() {
                    return 'executed';
                }
            }
            
            const testCommand = new TestCommand();
            assert.strictEqual(testCommand.execute(), 'executed');
        });
    });
}); 