// Template manager for Liquibase files

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Get template content for changelog or changeset
 * @param {string} format File format (xml, yaml, json, sql)
 * @param {string} fileType Type of file (changelog or changeset)
 * @param {string} templateType Type of template (root, object, release, custom for changelog; createTable, addColumn, etc. for changeset)
 * @param {Object} data Template data
 * @returns {string} Filled template content
 */
function getTemplateContent(format, fileType, templateType, data) {
    // Try to get user-defined template
    const userTemplate = getUserTemplate(format, fileType, templateType);
    if (userTemplate) {
        return fillTemplate(userTemplate, data);
    }
    
    // Use built-in template
    const builtInTemplate = getBuiltInTemplate(format, fileType, templateType);
    return fillTemplate(builtInTemplate, data);
}

/**
 * Get user-defined template
 * @param {string} format File format
 * @param {string} fileType Type of file
 * @param {string} templateType Type of template
 * @returns {string|null} Template content or null if not found
 */
function getUserTemplate(format, fileType, templateType) {
    try {
        const config = vscode.workspace.getConfiguration('liquibaseGenerator');
        const templateDirPath = config.get('templatesPath');
        
        if (!templateDirPath) {
            return null;
        }
        
        const templatePath = path.join(
            templateDirPath,
            fileType,
            format,
            `${templateType}.template.${format}`
        );
        
        if (!fs.existsSync(templatePath)) {
            return null;
        }
        
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('Error getting user template:', error);
        return null;
    }
}

/**
 * Get built-in template
 * @param {string} format File format
 * @param {string} fileType Type of file
 * @param {string} templateType Type of template
 * @returns {string} Template content
 */
function getBuiltInTemplate(format, fileType, templateType) {
    // Get the appropriate template based on format
    if (fileType === 'changelog') {
        switch (format.toLowerCase()) {
            case 'xml':
                return getXmlChangelogTemplate();
            case 'yaml':
            case 'yml':
                return getYamlChangelogTemplate();
            case 'json':
                return getJsonChangelogTemplate();
            case 'sql':
                return getSqlChangelogTemplate();
            default:
                return '';
        }
    } else if (fileType === 'changeset') {
        // For changeset templates, to be implemented
        return '';
    }
    
    return '';
}

/**
 * Fill template with data
 * @param {string} template Template content
 * @param {Object} data Template data
 * @returns {string} Filled template
 */
function fillTemplate(template, data) {
    let result = template;
    
    // Replace simple variables
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' || typeof value === 'number') {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(regex, String(value));
        }
    }
    
    // Replace type-specific details
    if (data.typeDetails) {
        for (const [key, value] of Object.entries(data.typeDetails)) {
            if (typeof value === 'string' || typeof value === 'number') {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                result = result.replace(regex, String(value));
            }
        }
    }
    
    return result;
}

// XML template function
function getXmlChangelogTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    
</databaseChangeLog>`;
}

// YAML template function
function getYamlChangelogTemplate() {
    return `databaseChangeLog:
`;
}

// JSON template function
function getJsonChangelogTemplate() {
    return `{
  "databaseChangeLog": [
  ]
}`;
}

// SQL template function
function getSqlChangelogTemplate() {
    return `--liquibase formatted sql
`;
}

module.exports = {
    getTemplateContent,
    getUserTemplate,
    getBuiltInTemplate,
    fillTemplate
}; 