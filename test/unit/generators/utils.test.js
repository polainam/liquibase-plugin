const sinon = require('sinon');
const assert = require('assert');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();

// Import the vscode mock
const vscodeMock = require('../mocks/vscode');

// Mock fs.promises
const fsPromisesMock = {
    readFile: sinon.stub(),
    writeFile: sinon.stub().resolves()
};

// Mock fs
const fsMock = {
    promises: fsPromisesMock
};

// Mock fileOperations
const fileOperationsMock = {
    getRelativePath: sinon.stub()
};

// Use proxyquire to load the module with our mocks
const utils = proxyquire('../../../src/generators/utils', {
    'vscode': vscodeMock,
    'fs': fsMock,
    '../common/fileOperations': fileOperationsMock
});

describe('utils', () => {
    let sandbox;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Reset all stubs
        vscodeMock.window.showInformationMessage.reset();
        vscodeMock.window.showErrorMessage.reset();
        fsPromisesMock.readFile.reset();
        fsPromisesMock.writeFile.reset();
        fileOperationsMock.getRelativePath.reset();
        
        // Mock console.error
        sandbox.stub(console, 'error');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('addToChangelogFile', () => {
        it('should add XML include to changelog file', async () => {
            const parentPath = '/test/changelog.xml';
            const childPath = '/test/changeset.xml';
            const relativePath = '../changeset.xml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            const parentContent = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
</databaseChangeLog>`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.calledOnce, true);
            
            const expectedContent = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    <include file="../changeset.xml"/>
</databaseChangeLog>
`;
            assert.deepStrictEqual(fsPromisesMock.writeFile.firstCall.args, [parentPath, expectedContent]);
        });
        
        it('should add YAML include to changelog file', async () => {
            const parentPath = '/test/changelog.yaml';
            const childPath = '/test/changeset.yaml';
            const relativePath = '../changeset.yaml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            const parentContent = `databaseChangeLog:
  - changeSet:
      id: 1
      author: test`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.calledOnce, true);
            
            // Check if the first argument of writeFile is the correct path
            assert.strictEqual(fsPromisesMock.writeFile.firstCall.args[0], parentPath);
            
            // Check if the second argument contains the expected content
            const actualContent = fsPromisesMock.writeFile.firstCall.args[1];
            assert.ok(actualContent.includes('databaseChangeLog:'));
            assert.ok(actualContent.includes('- changeSet:'));
            assert.ok(actualContent.includes('id: 1'));
            assert.ok(actualContent.includes('author: test'));
            assert.ok(actualContent.includes('- include:'));
            assert.ok(actualContent.includes(`file: ${relativePath}`));
        });
        
        it('should add YML include to changelog file', async () => {
            const parentPath = '/test/changelog.yml';
            const childPath = '/test/changeset.yml';
            const relativePath = '../changeset.yml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            const parentContent = `databaseChangeLog:
  - changeSet:
      id: 1
      author: test`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.calledOnce, true);
            
            // Check if the first argument of writeFile is the correct path
            assert.strictEqual(fsPromisesMock.writeFile.firstCall.args[0], parentPath);
            
            // Check if the second argument contains the expected content
            const actualContent = fsPromisesMock.writeFile.firstCall.args[1];
            assert.ok(actualContent.includes('databaseChangeLog:'));
            assert.ok(actualContent.includes('- changeSet:'));
            assert.ok(actualContent.includes('id: 1'));
            assert.ok(actualContent.includes('author: test'));
            assert.ok(actualContent.includes('- include:'));
            assert.ok(actualContent.includes(`file: ${relativePath}`));
        });
        
        it('should add JSON include to changelog file', async () => {
            const parentPath = '/test/changelog.json';
            const childPath = '/test/changeset.json';
            const relativePath = '../changeset.json';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            const parentContent = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "1",
        "author": "test"
      }
    }
  ]
}`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.calledOnce, true);
            
            const expectedContent = `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "1",
        "author": "test"
      }
    },
    {
      "include": {
        "file": "../changeset.json"
      }
    }
  ]
}`;
            assert.deepStrictEqual(fsPromisesMock.writeFile.firstCall.args, [parentPath, expectedContent]);
        });
        
        it('should show info message when file is already included', async () => {
            const parentPath = '/test/changelog.xml';
            const childPath = '/test/changeset.xml';
            const relativePath = '../changeset.xml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile with content that already includes the file
            const parentContent = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog>
    <include file="../changeset.xml"/>
</databaseChangeLog>`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath, { showInfoMessageIfExists: true });
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.called, false);
            assert.strictEqual(vscodeMock.window.showInformationMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showInformationMessage.firstCall.args[0], 'This file is already included in the changelog.');
        });
        
        it('should not show info message when file is already included but showInfoMessageIfExists is false', async () => {
            const parentPath = '/test/changelog.xml';
            const childPath = '/test/changeset.xml';
            const relativePath = '../changeset.xml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile with content that already includes the file
            const parentContent = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog>
    <include file="../changeset.xml"/>
</databaseChangeLog>`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, true);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.called, false);
            assert.strictEqual(vscodeMock.window.showInformationMessage.called, false);
        });
        
        it('should handle error when JSON parsing fails', async () => {
            const parentPath = '/test/changelog.json';
            const childPath = '/test/changeset.json';
            const relativePath = '../changeset.json';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile with invalid JSON
            const parentContent = `{
  "databaseChangeLog": "not an array"
}`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, false);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.called, false);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.ok(vscodeMock.window.showErrorMessage.firstCall.args[0].includes('Failed to update changelog'));
        });
        
        it('should handle error for unsupported format', async () => {
            const parentPath = '/test/changelog.sql';
            const childPath = '/test/changeset.sql';
            const relativePath = '../changeset.sql';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            fsPromisesMock.readFile.resolves('-- SQL content');
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, false);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.called, false);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.ok(vscodeMock.window.showErrorMessage.firstCall.args[0].includes('Unsupported format'));
        });
        
        it('should handle readFile error', async () => {
            const parentPath = '/test/changelog.xml';
            const childPath = '/test/changeset.xml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns('../changeset.xml');
            
            // Mock readFile to throw error
            const error = new Error('File not found');
            fsPromisesMock.readFile.rejects(error);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, false);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.called, false);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], `Failed to update changelog: ${error.message}`);
        });
        
        it('should handle writeFile error', async () => {
            const parentPath = '/test/changelog.xml';
            const childPath = '/test/changeset.xml';
            const relativePath = '../changeset.xml';
            
            // Mock getRelativePath
            fileOperationsMock.getRelativePath.returns(relativePath);
            
            // Mock readFile
            const parentContent = `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog></databaseChangeLog>`;
            fsPromisesMock.readFile.resolves(parentContent);
            
            // Mock writeFile to throw error
            const error = new Error('Permission denied');
            fsPromisesMock.writeFile.rejects(error);
            
            const result = await utils.addToChangelogFile(parentPath, childPath);
            
            assert.strictEqual(result, false);
            assert.strictEqual(fsPromisesMock.readFile.calledOnce, true);
            assert.strictEqual(fsPromisesMock.writeFile.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.calledOnce, true);
            assert.strictEqual(vscodeMock.window.showErrorMessage.firstCall.args[0], `Failed to update changelog: ${error.message}`);
        });
    });
}); 