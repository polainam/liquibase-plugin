const JsonProvider = require('./json/JsonProvider');
const XmlProvider = require('./xml/XmlProvider');
const YamlProvider = require('./yaml/YamlProvider');
const IntellisenseProvider = require('./IntellisenseProvider');

function getAllProviders() {
    return [
        new JsonProvider(),
        new XmlProvider(),
        new YamlProvider()
    ];
}

module.exports = getAllProviders;
