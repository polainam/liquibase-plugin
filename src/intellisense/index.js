const vscode = require('vscode');

const { registerCompletionProviderXml } = require('./xml/completionProviderXml');
const { registerCompletionProviderYaml } = require('./yaml/completionProviderYaml');
const { registerCompletionProviderJson } = require('./json/completionProviderJson');

function registerAllCompletionProviders(context) {
    registerCompletionProviderXml(context);
    registerCompletionProviderYaml(context);
    registerCompletionProviderJson(context);
}

module.exports = {
    registerAllCompletionProviders,
    registerCompletionProviderXml,
    registerCompletionProviderYaml,
    registerCompletionProviderJson
}; 