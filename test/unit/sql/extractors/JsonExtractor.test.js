const sinon = require('sinon');
const assert = require('assert');
const JsonExtractor = require('../../../../src/sql/extractors/jsonExtractor');

describe('JsonExtractor', () => {
    let extractor;
    let sandbox;
    
    beforeEach(() => {
        extractor = new JsonExtractor();
        sandbox = sinon.createSandbox();
        // Мокируем console.error для предотвращения вывода ошибок в тестах
        sandbox.stub(console, 'error');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('findChangesetStartLine', () => {
        it('should find the starting line of a changeset', () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "test-author",
        "changes": [
          {
            "createTable": {
              "tableName": "test_table"
            }
          }
        ]
      }
    }
  ]
}`;
            
            const startLine = extractor.findChangesetStartLine(content, '123', 'test-author');
            assert.strictEqual(startLine, 3);
        });
        
        it('should handle compact JSON format', () => {
            const content = `{"databaseChangeLog":[{"changeSet":{"id":"123","author":"test-author","changes":[{"createTable":{"tableName":"test_table"}}]}}]}`;
            
            const startLine = extractor.findChangesetStartLine(content, '123', 'test-author');
            assert.strictEqual(startLine, 0);
        });
        
        it('should return 0 if changeset not found', () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "456",
        "author": "other-author"
      }
    }
  ]
}`;
            
            const startLine = extractor.findChangesetStartLine(content, '123', 'test-author');
            assert.strictEqual(startLine, 0);
        });
    });
    
    describe('extractChangesetInfoAtCursor', () => {
        it('should extract changeset info when cursor is inside a changeset', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "test-author",
        "changes": [
          {
            "createTable": {
              "tableName": "test_table"
            }
          }
        ]
      }
    }
  ]
}`;
            
            // Позиция курсора внутри changeset (строка 7)
            const cursorPosition = content.indexOf('changes') + 2;
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.deepStrictEqual(result, { id: '123', author: 'test-author' });
        });
        
        it('should return null when cursor is not inside a changeset', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "test-author"
      }
    }
  ]
}`;
            
            // Позиция курсора вне changeset (строка 1)
            const cursorPosition = 5;
            const result = await extractor.extractChangesetInfoAtCursor(content, cursorPosition);
            
            assert.strictEqual(result, null);
        });
    });
    
    describe('getAllChangesets', () => {
        it('should return all changesets from valid JSON', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "author1"
      }
    },
    {
      "changeSet": {
        "id": "456",
        "author": "author2"
      }
    }
  ]
}`;
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, [
                { id: '123', author: 'author1', label: '123 (by author1)' },
                { id: '456', author: 'author2', label: '456 (by author2)' }
            ]);
        });
        
        it('should filter out non-changeset items', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "author1"
      }
    },
    {
      "property": {
        "name": "test"
      }
    }
  ]
}`;
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, [
                { id: '123', author: 'author1', label: '123 (by author1)' }
            ]);
        });
        
        it('should return empty array for non-changeset JSON', async () => {
            const content = `{
  "someOtherStructure": {
    "value": "test"
  }
}`;
            
            const result = await extractor.getAllChangesets(content);
            
            assert.deepStrictEqual(result, []);
        });
    });
    
    describe('findChangeset', () => {
        it('should find a specific changeset by id and author', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "author1",
        "changes": [
          {
            "createTable": {
              "tableName": "test_table"
            }
          }
        ]
      }
    },
    {
      "changeSet": {
        "id": "456",
        "author": "author2"
      }
    }
  ]
}`;
            
            const result = await extractor.findChangeset(content, '123', 'author1');
            
            assert.deepStrictEqual(result, {
                "id": "123",
                "author": "author1",
                "changes": [
                    {
                        "createTable": {
                            "tableName": "test_table"
                        }
                    }
                ]
            });
        });
        
        it('should return null if changeset not found', async () => {
            const content = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "123",
        "author": "author1"
      }
    }
  ]
}`;
            
            const result = await extractor.findChangeset(content, '456', 'author2');
            
            assert.strictEqual(result, null);
        });
    });
}); 