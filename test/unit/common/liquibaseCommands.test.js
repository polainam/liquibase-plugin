const assert = require('assert');
const path = require('path');
const liquibaseCommands = require('../../../src/common/liquibaseCommands');

describe('liquibaseCommands', () => {
    describe('createUpdateSqlCommand', () => {
        it('should create update SQL command with correct parameters', () => {
            const propertiesPath = '/path/to/liquibase.properties';
            const changeLogFile = 'changelog.xml';
            const searchPath = '/path/to/search';
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${changeLogFile}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createUpdateSqlCommand(propertiesPath, changeLogFile, searchPath);
            
            assert.strictEqual(result, expectedCommand);
        });
        
        it('should handle paths with spaces', () => {
            const propertiesPath = '/path/to/liquibase properties.properties';
            const changeLogFile = 'change log.xml';
            const searchPath = '/path/to/search directory';
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${changeLogFile}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createUpdateSqlCommand(propertiesPath, changeLogFile, searchPath);
            
            assert.strictEqual(result, expectedCommand);
        });
        
        it('should handle Windows paths with backslashes', () => {
            const propertiesPath = 'C:\\path\\to\\liquibase.properties';
            const changeLogFile = 'changelog.xml';
            const searchPath = 'C:\\path\\to\\search';
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${changeLogFile}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createUpdateSqlCommand(propertiesPath, changeLogFile, searchPath);
            
            assert.strictEqual(result, expectedCommand);
        });
    });
    
    describe('createLiquibaseCommand', () => {
        it('should create liquibase command with correct parameters', () => {
            const propertiesPath = '/path/to/liquibase.properties';
            const tempFilePath = '/tmp/temp_123456.xml';
            const workspaceFolder = '/path/to/workspace';
            
            const tempFileName = path.basename(tempFilePath);
            const searchPath = `${path.dirname(tempFilePath)},${workspaceFolder}`;
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createLiquibaseCommand(propertiesPath, tempFilePath, workspaceFolder);
            
            assert.strictEqual(result, expectedCommand);
        });
        
        it('should handle paths with spaces', () => {
            const propertiesPath = '/path/to/liquibase properties.properties';
            const tempFilePath = '/tmp/temp file 123456.xml';
            const workspaceFolder = '/path/to/workspace folder';
            
            const tempFileName = path.basename(tempFilePath);
            const searchPath = `${path.dirname(tempFilePath)},${workspaceFolder}`;
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createLiquibaseCommand(propertiesPath, tempFilePath, workspaceFolder);
            
            assert.strictEqual(result, expectedCommand);
        });
        
        it('should handle Windows paths with backslashes', () => {
            const propertiesPath = 'C:\\path\\to\\liquibase.properties';
            const tempFilePath = 'C:\\temp\\temp_123456.xml';
            const workspaceFolder = 'C:\\path\\to\\workspace';
            
            const tempFileName = path.basename(tempFilePath);
            const searchPath = `${path.dirname(tempFilePath)},${workspaceFolder}`;
            
            const expectedCommand = `liquibase --defaultsFile="${propertiesPath}" --changeLogFile="${tempFileName}" --searchPath="${searchPath}" updateSql`;
            
            const result = liquibaseCommands.createLiquibaseCommand(propertiesPath, tempFilePath, workspaceFolder);
            
            assert.strictEqual(result, expectedCommand);
        });
    });
}); 