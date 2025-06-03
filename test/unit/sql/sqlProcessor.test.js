const assert = require('assert');
const { extractChangesetSql } = require('../../../src/sql/sqlProcessor');

describe('sqlProcessor', () => {
    describe('extractChangesetSql', () => {
        it('should extract changeset SQL from full SQL output', () => {
            const fullSql = `-- Liquibase formatted SQL
-- Some comments
-- Changeset file::1::author
CREATE TABLE test (
    id INT PRIMARY KEY,
    name VARCHAR(255)
);
-- Comment
INSERT INTO DATABASECHANGELOG (ID, AUTHOR, FILENAME) VALUES ('1', 'author', 'file.sql');
-- Another changeset
-- Changeset file::2::author2
ALTER TABLE test ADD COLUMN email VARCHAR(255);`;

            const result = extractChangesetSql(fullSql, '1', 'author');
            
            const expected = `-- Changeset file::1::author
CREATE TABLE test (
    id INT PRIMARY KEY,
    name VARCHAR(255)
);`;
            
            assert.strictEqual(result, expected);
        });
        
        it('should handle changeset that ends with another changeset marker', () => {
            const fullSql = `-- Liquibase formatted SQL
-- Changeset file::1::author
CREATE TABLE test (
    id INT PRIMARY KEY
);
-- Changeset file::2::author2
ALTER TABLE test ADD COLUMN name VARCHAR(255);`;

            const result = extractChangesetSql(fullSql, '1', 'author');
            
            const expected = `-- Changeset file::1::author
CREATE TABLE test (
    id INT PRIMARY KEY
);`;
            
            assert.strictEqual(result, expected);
        });
    });
}); 