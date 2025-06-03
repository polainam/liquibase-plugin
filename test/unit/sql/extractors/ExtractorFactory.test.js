const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок классы для экстракторов
class XmlExtractorMock {
    constructor() {
        this.type = 'xml';
    }
    
    extractChangesetInfoAtCursor() {
        return Promise.resolve({ id: 'xml-id', author: 'xml-author' });
    }
    
    getAllChangesets() {
        return Promise.resolve([{ id: 'xml-id', author: 'xml-author', label: 'XML Changeset' }]);
    }
    
    findChangeset(content, id, author) {
        if (id === 'xml-id' && author === 'xml-author') {
            return Promise.resolve({ id, author, changes: [] });
        }
        return Promise.resolve(null);
    }
}

class YamlExtractorMock {
    constructor() {
        this.type = 'yaml';
    }
    
    extractChangesetInfoAtCursor() {
        return Promise.resolve({ id: 'yaml-id', author: 'yaml-author' });
    }
    
    getAllChangesets() {
        return Promise.resolve([{ id: 'yaml-id', author: 'yaml-author', label: 'YAML Changeset' }]);
    }
    
    findChangeset(content, id, author) {
        if (id === 'yaml-id' && author === 'yaml-author') {
            return Promise.resolve({ id, author, changes: [] });
        }
        return Promise.resolve(null);
    }
}

class JsonExtractorMock {
    constructor() {
        this.type = 'json';
    }
    
    extractChangesetInfoAtCursor() {
        return Promise.resolve({ id: 'json-id', author: 'json-author' });
    }
    
    getAllChangesets() {
        return Promise.resolve([{ id: 'json-id', author: 'json-author', label: 'JSON Changeset' }]);
    }
    
    findChangeset(content, id, author) {
        if (id === 'json-id' && author === 'json-author') {
            return Promise.resolve({ id, author, changes: [] });
        }
        return Promise.resolve(null);
    }
}

// Используем proxyquire для загрузки модуля с нашими моками
const extractorFactory = proxyquire('../../../../src/sql/extractors/ExtractorFactory', {
    './XmlExtractor': XmlExtractorMock,
    './YamlExtractor': YamlExtractorMock,
    './JsonExtractor': JsonExtractorMock
});

describe('ExtractorFactory', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('getFileFormat', () => {
        it('should throw error for unsupported extension', () => {
            assert.throws(() => {
                extractorFactory.getFileFormat('test.txt');
            }, /Unsupported file format/);
        });
    });
    
    describe('isYamlFile', () => {
        it('should return true for .yaml extension', () => {
            const result = extractorFactory.isYamlFile('test.yaml');
            assert.strictEqual(result, true);
        });
        
        it('should return true for .yml extension', () => {
            const result = extractorFactory.isYamlFile('test.yml');
            assert.strictEqual(result, true);
        });
        
        it('should return false for other extensions', () => {
            const result = extractorFactory.isYamlFile('test.xml');
            assert.strictEqual(result, false);
        });
    });
    
    describe('isJsonFile', () => {
        it('should return true for .json extension', () => {
            const result = extractorFactory.isJsonFile('test.json');
            assert.strictEqual(result, true);
        });
        
        it('should return false for other extensions', () => {
            const result = extractorFactory.isJsonFile('test.xml');
            assert.strictEqual(result, false);
        });
    });
    
    describe('getExtractorForFormat', () => {
        it('should return XmlExtractor for xml format', () => {
            const extractor = extractorFactory.getExtractorForFormat('xml');
            assert.strictEqual(extractor.type, 'xml');
        });
        
        it('should return YamlExtractor for yaml format', () => {
            const extractor = extractorFactory.getExtractorForFormat('yaml');
            assert.strictEqual(extractor.type, 'yaml');
        });
        
        it('should return JsonExtractor for json format', () => {
            const extractor = extractorFactory.getExtractorForFormat('json');
            assert.strictEqual(extractor.type, 'json');
        });
        
        it('should throw error for unsupported format', () => {
            assert.throws(() => {
                extractorFactory.getExtractorForFormat('txt');
            }, /No extractor available for format/);
        });
    });
    
    describe('getExtractorForFile', () => {
        it('should return XmlExtractor for .xml file', () => {
            const extractor = extractorFactory.getExtractorForFile('test.xml');
            assert.strictEqual(extractor.type, 'xml');
        });
        
        it('should return YamlExtractor for .yaml file', () => {
            const extractor = extractorFactory.getExtractorForFile('test.yaml');
            assert.strictEqual(extractor.type, 'yaml');
        });
        
        it('should return JsonExtractor for .json file', () => {
            const extractor = extractorFactory.getExtractorForFile('test.json');
            assert.strictEqual(extractor.type, 'json');
        });
        
        it('should throw error for unsupported file', () => {
            assert.throws(() => {
                extractorFactory.getExtractorForFile('test.txt');
            }, /Unsupported file format/);
        });
    });
    
    describe('extractChangesetInfoAtCursor', () => {
        it('should extract changeset info from XML file', async () => {
            const result = await extractorFactory.extractChangesetInfoAtCursor('content', 0, 'test.xml');
            assert.deepStrictEqual(result, { id: 'xml-id', author: 'xml-author' });
        });
        
        it('should extract changeset info from YAML file', async () => {
            const result = await extractorFactory.extractChangesetInfoAtCursor('content', 0, 'test.yaml');
            assert.deepStrictEqual(result, { id: 'yaml-id', author: 'yaml-author' });
        });
        
        it('should extract changeset info from JSON file', async () => {
            const result = await extractorFactory.extractChangesetInfoAtCursor('content', 0, 'test.json');
            assert.deepStrictEqual(result, { id: 'json-id', author: 'json-author' });
        });
    });
    
    describe('getAllChangesets', () => {
        it('should get all changesets from XML file', async () => {
            const result = await extractorFactory.getAllChangesets('content', 'test.xml');
            assert.deepStrictEqual(result, [{ id: 'xml-id', author: 'xml-author', label: 'XML Changeset' }]);
        });
        
        it('should get all changesets from YAML file', async () => {
            const result = await extractorFactory.getAllChangesets('content', 'test.yaml');
            assert.deepStrictEqual(result, [{ id: 'yaml-id', author: 'yaml-author', label: 'YAML Changeset' }]);
        });
        
        it('should get all changesets from JSON file', async () => {
            const result = await extractorFactory.getAllChangesets('content', 'test.json');
            assert.deepStrictEqual(result, [{ id: 'json-id', author: 'json-author', label: 'JSON Changeset' }]);
        });
    });
    
    describe('findChangeset', () => {
        it('should find changeset in XML file', async () => {
            const result = await extractorFactory.findChangeset('content', 'xml-id', 'xml-author', 'test.xml');
            assert.deepStrictEqual(result, { id: 'xml-id', author: 'xml-author', changes: [] });
        });
        
        it('should find changeset in YAML file', async () => {
            const result = await extractorFactory.findChangeset('content', 'yaml-id', 'yaml-author', 'test.yaml');
            assert.deepStrictEqual(result, { id: 'yaml-id', author: 'yaml-author', changes: [] });
        });
        
        it('should find changeset in JSON file', async () => {
            const result = await extractorFactory.findChangeset('content', 'json-id', 'json-author', 'test.json');
            assert.deepStrictEqual(result, { id: 'json-id', author: 'json-author', changes: [] });
        });
        
        it('should return null if changeset not found', async () => {
            const result = await extractorFactory.findChangeset('content', 'non-existent', 'author', 'test.xml');
            assert.strictEqual(result, null);
        });
    });
}); 