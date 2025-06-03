const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Мок для vscode
const vscodeMock = {
    window: {
        showErrorMessage: sinon.stub()
    }
};

// Мок для xml2js
const xml2jsMock = {
    parseStringPromise: sinon.stub()
};

// Используем proxyquire для загрузки модуля с нашими моками
const XmlExtractor = proxyquire('../../../../src/sql/extractors/xmlExtractor', {
    'vscode': vscodeMock,
    'xml2js': xml2jsMock
});

describe('XmlExtractor', () => {
    let extractor;
    let sandbox;
    
    beforeEach(() => {
        extractor = new XmlExtractor();
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        vscodeMock.window.showErrorMessage.reset();
        xml2jsMock.parseStringPromise.reset();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('extractChangesetInfoAtCursor', () => {
        it('should extract changeset info when cursor is inside a changeset', async () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">
    <changeSet id="123" author="test-author">
        <createTable tableName="test_table">
            <column name="id" type="int"/>
        </createTable>
    </changeSet>
</databaseChangeLog>`;
            
            // Позиция курсора внутри changeset (строка 4)
            const cursorPosition = content.indexOf('createTable');
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.deepStrictEqual(result, { id: '123', author: 'test-author' });
        });
        
        it('should handle multiple changesets correctly', async () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">
    <changeSet id="123" author="author1">
        <createTable tableName="table1"/>
    </changeSet>
    <changeSet id="456" author="author2">
        <createTable tableName="table2"/>
    </changeSet>
</databaseChangeLog>`;
            
            // Позиция курсора внутри второго changeset
            const cursorPosition = content.indexOf('table2');
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.deepStrictEqual(result, { id: '456', author: 'author2' });
        });
    });
    
    describe('getAllChangesets', () => {        
        it('should handle parsing error', async () => {
            xml2jsMock.parseStringPromise.rejects(new Error('XML parsing error'));
            
            const content = 'invalid xml';
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, []);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], 'Failed to parse changelog: XML parsing error');
        });
    });
    
    describe('findChangeset', () => {
        it('should find a specific changeset by id and author', async () => {
            const changeset1 = { 
                $: { id: '123', author: 'author1' },
                createTable: [{ $: { tableName: 'test_table' } }]
            };
            
            const changeset2 = { 
                $: { id: '456', author: 'author2' },
                addColumn: [{ $: { tableName: 'test_table' } }]
            };
            
            const parsedXml = {
                databaseChangeLog: {
                    changeSet: [changeset1, changeset2]
                }
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            const content = '<databaseChangeLog></databaseChangeLog>'; // Содержимое не важно, т.к. мы мокаем parseStringPromise
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, changeset1);
            
            assert.strictEqual(xml2jsMock.parseStringPromise.calledOnce, true);
            assert.strictEqual(xml2jsMock.parseStringPromise.firstCall.args[0], content);
        });
        
        it('should return null when no changesets found', async () => {
            const parsedXml = {
                databaseChangeLog: {
                    // Нет changeSet
                }
            };
            
            xml2jsMock.parseStringPromise.resolves(parsedXml);
            
            const content = '<databaseChangeLog></databaseChangeLog>';
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, null);
        });
        
        it('should handle parsing error', async () => {
            xml2jsMock.parseStringPromise.rejects(new Error('XML parsing error'));
            
            const content = 'invalid xml';
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.strictEqual(result, null);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], 'Error parsing changelog: XML parsing error');
        });
    });
    
    describe('extractDocumentBoundaries', () => {
        it('should extract XML document boundaries', () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">
    <changeSet id="123" author="test-author">
        <createTable tableName="test_table"/>
    </changeSet>
</databaseChangeLog>`;
            
            const result = extractor.extractDocumentBoundaries(content);
            
            assert.deepStrictEqual(result, {
                xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>',
                header: '<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">',
                footer: '</databaseChangeLog>'
            });
        });
        
        it('should use default XML declaration if not present', () => {
            const content = `<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">
    <changeSet id="123" author="test-author"/>
</databaseChangeLog>`;
            
            const result = extractor.extractDocumentBoundaries(content);
            
            assert.deepStrictEqual(result, {
                xmlDeclaration: '<?xml version="1.0" encoding="UTF-8"?>',
                header: '<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog">',
                footer: '</databaseChangeLog>'
            });
        });
        
        it('should throw error if databaseChangeLog tags not found', () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<someOtherTag>
    <content/>
</someOtherTag>`;
            
            assert.throws(() => {
                extractor.extractDocumentBoundaries(content);
            }, /Не удалось найти <databaseChangeLog> или <\/databaseChangeLog> в файле./);
        });
    });
}); 