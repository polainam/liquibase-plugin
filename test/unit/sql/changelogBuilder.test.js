const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для yaml
const yamlMock = {
    load: sinon.stub(),
    dump: sinon.stub()
};

// Мок для xml2js
const xml2jsMock = {
    parseStringPromise: sinon.stub(),
    Builder: class {
        buildObject(obj) {
            return '<xml version="1.0" xmlns="http://www.liquibase.org/xml/ns/dbchangelog">' + JSON.stringify(obj) + '</xml>';
        }
    }
};

// Мок для ExtractorFactory
const extractorFactoryMock = {
    findChangeset: sinon.stub()
};

// Используем proxyquire для загрузки модуля с нашими моками
const { buildTempChangelog } = proxyquire('../../../src/sql/changeloBuilder', {
    'js-yaml': yamlMock,
    'xml2js': xml2jsMock,
    './extractors/ExtractorFactory': extractorFactoryMock
});

describe('changelogBuilder', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        yamlMock.load.reset();
        yamlMock.dump.reset();
        xml2jsMock.parseStringPromise.reset();
        extractorFactoryMock.findChangeset.reset();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('buildTempChangelog', () => {
        it('should build temp changelog for YAML format', async () => {
            const content = 'yaml content';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.yaml';
            const changeset = { id: '1', author: 'author', changes: [] };
            const dumpedYaml = 'dumped yaml';
            
            yamlMock.load.returns({
                databaseChangeLog: [{ changeSet: changeset }]
            });
            
            extractorFactoryMock.findChangeset.resolves(changeset);
            yamlMock.dump.returns(dumpedYaml);
            
            const result = await buildTempChangelog(content, changesetInfo, filePath, true, false);
            
            assert.strictEqual(extractorFactoryMock.findChangeset.calledOnce, true);
            assert.deepStrictEqual(extractorFactoryMock.findChangeset.firstCall.args, 
                [content, changesetInfo.id, changesetInfo.author, filePath]);
            
            assert.strictEqual(yamlMock.dump.calledOnce, true);
            assert.deepStrictEqual(yamlMock.dump.firstCall.args[0], 
                { databaseChangeLog: [{ changeSet: changeset }] });
            
            assert.deepStrictEqual(result, { tempContent: dumpedYaml, extension: '.yaml' });
        });
    
        it('should throw error when databaseChangeLog is not an array in YAML', async () => {
            const content = 'yaml content';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.yaml';
            
            yamlMock.load.returns({
                databaseChangeLog: { notAnArray: true }
            });
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, true, false),
                { message: 'Invalid YAML changelog format' }
            );
        });
        
        it('should build temp changelog for JSON format', async () => {
            const content = '{"databaseChangeLog": []}';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.json';
            const changeset = { id: '1', author: 'author', changes: [] };
            
            extractorFactoryMock.findChangeset.resolves(changeset);
            
            const result = await buildTempChangelog(content, changesetInfo, filePath, false, true);
            
            assert.strictEqual(extractorFactoryMock.findChangeset.calledOnce, true);
            assert.deepStrictEqual(extractorFactoryMock.findChangeset.firstCall.args, 
                [content, changesetInfo.id, changesetInfo.author, filePath]);
            
            const expectedContent = JSON.stringify({ 
                databaseChangeLog: [{ changeSet: changeset }] 
            }, null, 2);
            
            assert.deepStrictEqual(result, { tempContent: expectedContent, extension: '.json' });
        });
        
        it('should throw error if JSON changeset not found', async () => {
            const content = '{"databaseChangeLog": []}';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.json';
            
            extractorFactoryMock.findChangeset.resolves(null);
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, true),
                { message: 'Changeset not found: id=1, author=author' }
            );
        });
        
        it('should throw error for invalid JSON format', async () => {
            const content = '{"someOtherProperty": []}';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.json';
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, true),
                { message: 'Invalid JSON changelog format' }
            );
        });
        
        it('should throw error when databaseChangeLog is not an array in JSON', async () => {
            const content = '{"databaseChangeLog": {"notAnArray": true}}';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.json';
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, true),
                { message: 'Invalid JSON changelog format' }
            );
        });
        
        it('should build temp changelog for XML format', async () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.xml';
            
            const parsedXml = { 
                databaseChangeLog: { 
                    $: { xmlns: 'http://www.liquibase.org/xml/ns/dbchangelog' },
                    changeSet: [
                        { $: { id: '1', author: 'author' }, createTable: [] }
                    ] 
                } 
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            const result = await buildTempChangelog(content, changesetInfo, filePath, false, false);
            
            assert.strictEqual(xml2jsMock.parseStringPromise.calledOnce, true);
            assert.strictEqual(xml2jsMock.parseStringPromise.firstCall.args[0], content);
            
            // Проверяем, что результат содержит XML с нужным чейнджсетом
            assert.strictEqual(result.extension, '.xml');
            assert.ok(result.tempContent.includes('http://www.liquibase.org/xml/ns/dbchangelog'));
            assert.ok(result.tempContent.includes('"id":"1"'));
            assert.ok(result.tempContent.includes('"author":"author"'));
        });
        
        it('should throw error if XML changeset not found', async () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.xml';
            
            const parsedXml = { 
                databaseChangeLog: { 
                    $: { xmlns: 'http://www.liquibase.org/xml/ns/dbchangelog' },
                    changeSet: [
                        { $: { id: '2', author: 'other' } } // Другой changeset
                    ] 
                } 
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, false),
                { message: 'Changeset not found: id=1, author=author' }
            );
        });
        
        it('should throw error for invalid XML format', async () => {
            const content = '<someOtherTag></someOtherTag>';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.xml';
            
            const parsedXml = { 
                someOtherTag: {} // Нет databaseChangeLog
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, false),
                { message: 'Invalid XML changelog format' }
            );
        });
        
        it('should handle XML with no changesets', async () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const changesetInfo = { id: '1', author: 'author' };
            const filePath = '/path/to/file.xml';
            
            const parsedXml = { 
                databaseChangeLog: { 
                    $: { xmlns: 'http://www.liquibase.org/xml/ns/dbchangelog' }
                    // Нет changeSet
                } 
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            await assert.rejects(
                () => buildTempChangelog(content, changesetInfo, filePath, false, false),
                { message: 'Changeset not found: id=1, author=author' }
            );
        });
    });
}); 