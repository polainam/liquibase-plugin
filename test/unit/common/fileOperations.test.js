const sinon = require('sinon');
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const path = require('path');
const os = require('os');
const moment = require('moment');

// Моки для зависимостей
const fsMock = {
    writeFileSync: sinon.stub(),
    existsSync: sinon.stub(),
    unlinkSync: sinon.stub(),
    promises: {
        writeFile: sinon.stub()
    }
};

const vscodeMock = {
    workspace: {
        getConfiguration: sinon.stub()
    }
};

const configMock = {
    get: sinon.stub()
};

// Загружаем модуль с моками
const fileOperations = proxyquire('../../../src/common/fileOperations', {
    'fs': fsMock,
    'vscode': vscodeMock
});

describe('fileOperations', () => {
    let sandbox;
    let consoleErrorStub;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Сбрасываем моки
        fsMock.writeFileSync.reset();
        fsMock.existsSync.reset();
        fsMock.unlinkSync.reset();
        fsMock.promises.writeFile.reset();
        vscodeMock.workspace.getConfiguration.reset();
        configMock.get.reset();
        
        // Настраиваем стандартное поведение моков
        vscodeMock.workspace.getConfiguration.returns(configMock);
        fsMock.promises.writeFile.resolves();
        
        // Заменяем console.error на стаб
        consoleErrorStub = sandbox.stub(console, 'error');
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe('formatFilename', () => {
        it('should replace variables in pattern', () => {
            const pattern = 'changelog_{author}_{id}.{ext}';
            const variables = { author: 'test', id: '123', ext: 'xml' };
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            assert.strictEqual(result, 'changelog_test_123.xml');
        });
        
        it('should replace date variable using configured date format', () => {
            const pattern = 'changelog_{date}.{ext}';
            const variables = { ext: 'xml' };
            const dateFormat = 'YYYYMMDD';
            const formattedDate = moment().format(dateFormat);
            
            configMock.get.withArgs('dateFormatInFilenames').returns(dateFormat);
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            assert.strictEqual(result, `changelog_${formattedDate}.xml`);
            assert.strictEqual(vscodeMock.workspace.getConfiguration.calledOnce, true);
            assert.strictEqual(configMock.get.calledOnce, true);
        });
        
        it('should use default date format if not configured', () => {
            const pattern = 'changelog_{date}.{ext}';
            const variables = { ext: 'xml' };
            const defaultDateFormat = 'YYYYMMDD';
            const formattedDate = moment().format(defaultDateFormat);
            
            configMock.get.withArgs('dateFormatInFilenames').returns(null);
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            assert.strictEqual(result, `changelog_${formattedDate}.xml`);
        });
        
        it('should ignore non-string variables', () => {
            const pattern = 'changelog_{author}_{count}.{ext}';
            const variables = { author: 'test', count: 123, ext: 'xml' };
            
            // Мокаем Object.entries для возврата значений как строк
            const originalEntries = Object.entries;
            Object.entries = (obj) => {
                return originalEntries(obj).map(([key, value]) => {
                    if (key === 'count') {
                        return [key, value.toString()];
                    }
                    return [key, value];
                });
            };
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            // Восстанавливаем оригинальную функцию
            Object.entries = originalEntries;
            
            assert.strictEqual(result, 'changelog_test_123.xml');
        });
        
        it('should handle pattern without variables', () => {
            const pattern = 'changelog.xml';
            const variables = { author: 'test', id: '123' };
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            assert.strictEqual(result, 'changelog.xml');
        });
        
        it('should handle repeated variables', () => {
            const pattern = '{name}_{name}.{ext}';
            const variables = { name: 'test', ext: 'xml' };
            
            const result = fileOperations.formatFilename(pattern, variables);
            
            assert.strictEqual(result, 'test_test.xml');
        });
    });
    
    describe('getRelativePath', () => {
        it('should return relative path between two files', () => {
            const fromFile = '/path/to/file1.txt';
            const toFile = '/path/to/subdir/file2.txt';
            const expectedPath = 'subdir/file2.txt';
            
            const result = fileOperations.getRelativePath(fromFile, toFile);
            
            assert.strictEqual(result, expectedPath);
        });
        
        it('should handle paths with different roots', () => {
            const fromFile = '/path/to/file1.txt';
            const toFile = '/other/path/file2.txt';
            const expectedPath = '../../other/path/file2.txt';
            
            const result = fileOperations.getRelativePath(fromFile, toFile);
            
            assert.strictEqual(result, expectedPath);
        });
        
        it('should handle Windows paths with backslashes', () => {
            const fromFile = 'C:\\path\\to\\file1.txt';
            const toFile = 'C:\\path\\to\\subdir\\file2.txt';
            const expectedPath = 'subdir/file2.txt';
            
            const result = fileOperations.getRelativePath(fromFile, toFile);
            
            assert.strictEqual(result, expectedPath);
        });
    });
    
    describe('createTempFile', () => {
        it('should create temporary file with content', () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const prefix = 'test';
            const extension = '.xml';
            const expectedContent = '<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog></databaseChangeLog>';
            
            // Мокаем Date.now() для предсказуемого имени файла
            const dateNowStub = sandbox.stub(Date, 'now').returns(123456);
            
            const expectedPath = path.join(os.tmpdir(), `${prefix}_${123456}${extension}`);
            
            const result = fileOperations.createTempFile(content, prefix, extension);
            
            assert.strictEqual(result, expectedPath);
            assert.strictEqual(fsMock.writeFileSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.writeFileSync.firstCall.args, [expectedPath, expectedContent]);
            
            dateNowStub.restore();
        });
        
        it('should add XML declaration for XML files', () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const prefix = 'test';
            const extension = '.xml';
            const expectedContent = '<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog></databaseChangeLog>';
            
            // Мокаем Date.now() для предсказуемого имени файла
            const dateNowStub = sandbox.stub(Date, 'now').returns(123456);
            
            const expectedPath = path.join(os.tmpdir(), `${prefix}_${123456}${extension}`);
            
            const result = fileOperations.createTempFile(content, prefix, extension);
            
            assert.strictEqual(result, expectedPath);
            assert.strictEqual(fsMock.writeFileSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.writeFileSync.firstCall.args, [expectedPath, expectedContent]);
            
            dateNowStub.restore();
        });
        
        it('should not add XML declaration if already present', () => {
            const content = '<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog></databaseChangeLog>';
            const prefix = 'test';
            const extension = '.xml';
            
            // Мокаем Date.now() для предсказуемого имени файла
            const dateNowStub = sandbox.stub(Date, 'now').returns(123456);
            
            const expectedPath = path.join(os.tmpdir(), `${prefix}_${123456}${extension}`);
            
            const result = fileOperations.createTempFile(content, prefix, extension);
            
            assert.strictEqual(result, expectedPath);
            assert.strictEqual(fsMock.writeFileSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.writeFileSync.firstCall.args, [expectedPath, content]);
            
            dateNowStub.restore();
        });
        
        it('should not add XML declaration for non-XML files', () => {
            const content = '{"databaseChangeLog": []}';
            const prefix = 'test';
            const extension = '.json';
            
            // Мокаем Date.now() для предсказуемого имени файла
            const dateNowStub = sandbox.stub(Date, 'now').returns(123456);
            
            const expectedPath = path.join(os.tmpdir(), `${prefix}_${123456}${extension}`);
            
            const result = fileOperations.createTempFile(content, prefix, extension);
            
            assert.strictEqual(result, expectedPath);
            assert.strictEqual(fsMock.writeFileSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.writeFileSync.firstCall.args, [expectedPath, content]);
            
            dateNowStub.restore();
        });
        
        it('should use default prefix and extension if not provided', () => {
            const content = '<databaseChangeLog></databaseChangeLog>';
            const expectedContent = '<?xml version="1.0" encoding="UTF-8"?>\n<databaseChangeLog></databaseChangeLog>';
            
            // Мокаем Date.now() для предсказуемого имени файла
            const dateNowStub = sandbox.stub(Date, 'now').returns(123456);
            
            const expectedPath = path.join(os.tmpdir(), `temp_${123456}.xml`);
            
            const result = fileOperations.createTempFile(content);
            
            assert.strictEqual(result, expectedPath);
            assert.strictEqual(fsMock.writeFileSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.writeFileSync.firstCall.args, [expectedPath, expectedContent]);
            
            dateNowStub.restore();
        });
    });
    
    describe('deleteFileIfExists', () => {
        it('should delete file if it exists', () => {
            const filePath = '/path/to/file.txt';
            
            fsMock.existsSync.withArgs(filePath).returns(true);
            
            fileOperations.deleteFileIfExists(filePath);
            
            assert.strictEqual(fsMock.existsSync.calledOnce, true);
            assert.strictEqual(fsMock.unlinkSync.calledOnce, true);
            assert.deepStrictEqual(fsMock.unlinkSync.firstCall.args, [filePath]);
        });
        
        it('should not attempt to delete file if it does not exist', () => {
            const filePath = '/path/to/nonexistent.txt';
            
            fsMock.existsSync.withArgs(filePath).returns(false);
            
            fileOperations.deleteFileIfExists(filePath);
            
            assert.strictEqual(fsMock.existsSync.calledOnce, true);
            assert.strictEqual(fsMock.unlinkSync.called, false);
        });
        
        it('should handle errors during file deletion', () => {
            const filePath = '/path/to/file.txt';
            const error = new Error('Permission denied');
            
            fsMock.existsSync.withArgs(filePath).returns(true);
            fsMock.unlinkSync.withArgs(filePath).throws(error);
            
            fileOperations.deleteFileIfExists(filePath);
            
            assert.strictEqual(fsMock.existsSync.calledOnce, true);
            assert.strictEqual(fsMock.unlinkSync.calledOnce, true);
            assert.strictEqual(consoleErrorStub.calledOnce, true);
            assert.deepStrictEqual(consoleErrorStub.firstCall.args[0], `Failed to delete file ${filePath}:`);
        });
    });
    
    describe('writeFile', () => {
        it('should write content to file', async () => {
            const filePath = '/path/to/file.txt';
            const content = 'file content';
            
            await fileOperations.writeFile(filePath, content);
            
            assert.strictEqual(fsMock.promises.writeFile.calledOnce, true);
            assert.deepStrictEqual(fsMock.promises.writeFile.firstCall.args, [filePath, content]);
        });
        
        it('should throw error if write fails', async () => {
            const filePath = '/path/to/file.txt';
            const content = 'file content';
            const error = new Error('Write error');
            
            fsMock.promises.writeFile.rejects(error);
            
            try {
                await fileOperations.writeFile(filePath, content);
                assert.fail('Expected function to throw');
            } catch (err) {
                assert.strictEqual(err.message, 'Failed to write file: Write error');
            }
            
            assert.strictEqual(fsMock.promises.writeFile.calledOnce, true);
        });
    });
}); 