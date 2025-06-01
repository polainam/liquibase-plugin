class ExtensionCommand {
    constructor() {
        if (this.constructor === ExtensionCommand) {
            throw new Error('ExtensionCommand is an abstract class and cannot be instantiated directly.');
        }
    }

    getCommandId() {
        throw new Error('getCommandId() must be implemented.');
    }

    /**
    * @returns {any}
    */
    execute() {
        throw new Error('execute() must be implemented.');
    }
}

module.exports = ExtensionCommand;
