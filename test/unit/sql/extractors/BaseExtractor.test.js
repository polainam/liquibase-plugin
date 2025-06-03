const sinon = require('sinon');
const assert = require('assert');
const BaseExtractor = require('../../../../src/sql/extractors/BaseExtractor');

describe('BaseExtractor', () => {
    let extractor;
    
    beforeEach(() => {
        extractor = new BaseExtractor();
    });
    
    describe('splitLines', () => {
        it('should split text by line breaks', () => {
            const text = 'line1\nline2\nline3';
            const result = extractor.splitLines(text);
            
            assert.deepStrictEqual(result, ['line1', 'line2', 'line3']);
        });
    });
    
    describe('getLineNumberFromPosition', () => {
        it('should return correct line number for position', () => {
            const text = 'line1\nline2\nline3';
            
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 0), 0); // начало первой строки
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 5), 0); // конец первой строки
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 6), 1); // начало второй строки
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 11), 1); // конец второй строки
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 12), 2); // начало третьей строки
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 17), 2); // конец третьей строки
        });
        
        it('should handle position beyond text length', () => {
            const text = 'line1\nline2';
            
            assert.strictEqual(extractor.getLineNumberFromPosition(text, 100), 1); // позиция за пределами текста
        });
    });
    
    describe('abstract methods', () => {
        it('should throw error when extractChangesetInfoAtCursor is not implemented', async () => {
            await assert.rejects(
                () => extractor.extractChangesetInfoAtCursor('content', 0),
                { message: 'Must be implemented' }
            );
        });
    });
}); 