const vscode = require('vscode');

function createGeneralStatusBarItem() {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

    statusBarItem.text = "$(extensions) Liquibase";
    statusBarItem.tooltip = "Execute Liquibase command";
    statusBarItem.color = "#2962ff";
    statusBarItem.command = {
        command: "workbench.action.quickOpen",
        arguments: [">Liquibase: "],
        title: "Open Command Palette"
    };

    statusBarItem.show();

    return statusBarItem;
}

module.exports = {
    createGeneralStatusBarItem
};
