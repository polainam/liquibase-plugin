const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Импортируем мок vscode
const vscodeMock = require('../mocks/vscode');

// Мокируем провайдеры
class JsonProviderMock {
    constructor() {
        this.name = 'JsonProvider';
    }
}

class XmlProviderMock {
    constructor() {
        this.name = 'XmlProvider';
    }
}

class YamlProviderMock {
    constructor() {
        this.name = 'YamlProvider';
    }
}

// Мокируем IntellisenseProvider
class IntellisenseProviderMock {
    constructor(languageId) {
        this.languageId = languageId;
    }
}

// Используем proxyquire для загрузки модуля с нашими моками
const getAllProviders = proxyquire('../../../src/intellisense/index', {
    'vscode': vscodeMock,
    './json/JsonProvider': JsonProviderMock,
    './xml/XmlProvider': XmlProviderMock,
    './yaml/YamlProvider': YamlProviderMock,
    './IntellisenseProvider': IntellisenseProviderMock
});

describe('intellisense/index', () => {
    it('should return all providers', () => {
        const providers = getAllProviders();
        
        assert.strictEqual(providers.length, 3);
        assert.strictEqual(providers[0].name, 'JsonProvider');
        assert.strictEqual(providers[1].name, 'XmlProvider');
        assert.strictEqual(providers[2].name, 'YamlProvider');
    });
}); 