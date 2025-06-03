const assert = require('assert');
const { getTemplate, getBuiltInTemplate, fillTemplate } = require('../../../src/generators/templateFactory');

describe('templateFactory', () => {
    describe('getBuiltInTemplate', () => {
        it('should return XML changelog template', () => {
            const template = getBuiltInTemplate('xml', 'changelog');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('<?xml version="1.0" encoding="UTF-8"?>'));
            assert.ok(template.includes('<databaseChangeLog'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return YAML changelog template', () => {
            const template = getBuiltInTemplate('yaml', 'changelog');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('databaseChangeLog:'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return YML changelog template', () => {
            const template = getBuiltInTemplate('yml', 'changelog');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('databaseChangeLog:'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return JSON changelog template', () => {
            const template = getBuiltInTemplate('json', 'changelog');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('"databaseChangeLog"'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return SQL changelog template', () => {
            const template = getBuiltInTemplate('sql', 'changelog');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('--liquibase formatted sql'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return XML changeset template', () => {
            const template = getBuiltInTemplate('xml', 'changeset');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('<?xml version="1.0" encoding="UTF-8"?>'));
            assert.ok(template.includes('<changeSet id="{{id}}" author="{{author}}">'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return YAML changeset template', () => {
            const template = getBuiltInTemplate('yaml', 'changeset');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('databaseChangeLog:'));
            assert.ok(template.includes('id: {{id}}'));
            assert.ok(template.includes('author: {{author}}'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return YML changeset template', () => {
            const template = getBuiltInTemplate('yml', 'changeset');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('databaseChangeLog:'));
            assert.ok(template.includes('id: {{id}}'));
            assert.ok(template.includes('author: {{author}}'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return JSON changeset template', () => {
            const template = getBuiltInTemplate('json', 'changeset');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('"databaseChangeLog"'));
            assert.ok(template.includes('"id": "{{id}}"'));
            assert.ok(template.includes('"author": "{{author}}"'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return SQL changeset template', () => {
            const template = getBuiltInTemplate('sql', 'changeset');
            assert.strictEqual(typeof template, 'string');
            assert.ok(template.includes('--liquibase formatted sql'));
            assert.ok(template.includes('--changeset {{author}}:{{id}}'));
            assert.ok(template.includes('CURSOR_POSITION'));
        });

        it('should return empty string for unknown format', () => {
            const template = getBuiltInTemplate('unknown', 'changelog');
            assert.strictEqual(template, '');
        });

        it('should return empty string for unknown file type', () => {
            const template = getBuiltInTemplate('xml', 'unknown');
            assert.strictEqual(template, '');
        });
    });

    describe('fillTemplate', () => {
        it('should replace placeholders with values', () => {
            const template = 'Hello {{name}}! Your age is {{age}}.';
            const data = { name: 'John', age: 30 };
            const result = fillTemplate(template, data);
            assert.strictEqual(result, 'Hello John! Your age is 30.');
        });

        it('should handle nested typeDetails', () => {
            const template = 'Hello {{name}}! Your age is {{age}}. Your job is {{job}}.';
            const data = { 
                name: 'John', 
                age: 30,
                typeDetails: {
                    job: 'Developer'
                }
            };
            const result = fillTemplate(template, data);
            assert.strictEqual(result, 'Hello John! Your age is 30. Your job is Developer.');
        });

        it('should handle multiple occurrences of the same placeholder', () => {
            const template = 'Hello {{name}}! Welcome {{name}}!';
            const data = { name: 'John' };
            const result = fillTemplate(template, data);
            assert.strictEqual(result, 'Hello John! Welcome John!');
        });

        it('should convert numbers to strings', () => {
            const template = 'Your age is {{age}}.';
            const data = { age: 30 };
            const result = fillTemplate(template, data);
            assert.strictEqual(result, 'Your age is 30.');
        });

        it('should ignore non-string and non-number values', () => {
            const template = 'Hello {{name}}! Your data is {{data}}.';
            const data = { 
                name: 'John',
                data: { complex: 'object' }
            };
            const result = fillTemplate(template, data);
            assert.strictEqual(result, 'Hello John! Your data is {{data}}.');
        });
    });

    describe('getTemplate', () => {
        it('should return filled template for changeset', () => {
            const result = getTemplate('xml', 'changeset', { id: 'test-id', author: 'test-author' });
            assert.ok(result.includes('<changeSet id="test-id" author="test-author">'));
        });

        it('should return raw template for changelog', () => {
            const result = getTemplate('xml', 'changelog', { id: 'test-id', author: 'test-author' });
            assert.ok(result.includes('<?xml version="1.0" encoding="UTF-8"?>'));
            assert.ok(!result.includes('test-id'));
            assert.ok(!result.includes('test-author'));
        });

        it('should handle nested typeDetails for changeset', () => {
            const result = getTemplate('xml', 'changeset', { 
                id: 'test-id', 
                typeDetails: { 
                    author: 'test-author' 
                }
            });
            assert.ok(result.includes('<changeSet id="test-id" author="test-author">'));
        });
    });
}); 