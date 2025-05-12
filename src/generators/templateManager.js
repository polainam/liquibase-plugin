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
    // Provide default templates for different formats and types
    
    // XML templates
    if (format === 'xml') {
        if (fileType === 'changelog') {
            if (templateType === 'root') {
                return getXmlRootChangelogTemplate();
            } else if (templateType === 'object') {
                return getXmlObjectChangelogTemplate();
            } else if (templateType === 'release') {
                return getXmlReleaseChangelogTemplate();
            } else {
                return getXmlCustomChangelogTemplate();
            }
        } else if (fileType === 'changeset') {
            // For changeset templates, to be implemented
            return '';
        }
    }
    
    // YAML templates
    else if (format === 'yaml' || format === 'yml') {
        if (fileType === 'changelog') {
            if (templateType === 'root') {
                return getYamlRootChangelogTemplate();
            } else if (templateType === 'object') {
                return getYamlObjectChangelogTemplate();
            } else if (templateType === 'release') {
                return getYamlReleaseChangelogTemplate();
            } else {
                return getYamlCustomChangelogTemplate();
            }
        } else if (fileType === 'changeset') {
            // For changeset templates, to be implemented
            return '';
        }
    }
    
    // JSON templates
    else if (format === 'json') {
        if (fileType === 'changelog') {
            if (templateType === 'root') {
                return getJsonRootChangelogTemplate();
            } else if (templateType === 'object') {
                return getJsonObjectChangelogTemplate();
            } else if (templateType === 'release') {
                return getJsonReleaseChangelogTemplate();
            } else {
                return getJsonCustomChangelogTemplate();
            }
        } else if (fileType === 'changeset') {
            // For changeset templates, to be implemented
            return '';
        }
    }
    
    // SQL templates
    else if (format === 'sql') {
        if (fileType === 'changelog') {
            if (templateType === 'root') {
                return getSqlRootChangelogTemplate();
            } else if (templateType === 'object') {
                return getSqlObjectChangelogTemplate();
            } else if (templateType === 'release') {
                return getSqlReleaseChangelogTemplate();
            } else {
                return getSqlCustomChangelogTemplate();
            }
        } else if (fileType === 'changeset') {
            // For changeset templates, to be implemented
            return '';
        }
    }
    
    // Default empty template
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

// XML template functions
function getXmlRootChangelogTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    
    <!-- Root Changelog: {{name}} -->
    <!-- Description: {{description}} -->
    <!-- Created: {{date}} -->
    
    <!-- Include your changelog files here -->
    
</databaseChangeLog>`;
}

function getXmlObjectChangelogTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    
    <!-- Object Changelog: {{name}} -->
    <!-- Description: {{description}} -->
    <!-- Object Type: {{objectType}} -->
    <!-- Created: {{date}} -->
    
    <changeSet id="initial-{{name}}" author="{{author}}">
        <!-- Add your changes here -->
    </changeSet>
    
</databaseChangeLog>`;
}

function getXmlReleaseChangelogTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    
    <!-- Release Changelog: {{name}} -->
    <!-- Version: {{version}} -->
    <!-- Description: {{description}} -->
    <!-- Created: {{date}} -->
    
    <changeSet id="{{version}}-initial" author="{{author}}">
        <!-- Add your changes here -->
    </changeSet>
    
</databaseChangeLog>`;
}

function getXmlCustomChangelogTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    
    <!-- Custom Changelog: {{name}} -->
    <!-- Type: {{customType}} -->
    <!-- Description: {{description}} -->
    <!-- Created: {{date}} -->
    
    <changeSet id="initial-{{name}}" author="{{author}}">
        <!-- Add your changes here -->
    </changeSet>
    
</databaseChangeLog>`;
}

// YAML template functions
function getYamlRootChangelogTemplate() {
    return `databaseChangeLog:
  # Root Changelog: {{name}}
  # Description: {{description}}
  # Created: {{date}}
  
  # Include your changelog files here
`;
}

function getYamlObjectChangelogTemplate() {
    return `databaseChangeLog:
  # Object Changelog: {{name}}
  # Description: {{description}}
  # Object Type: {{objectType}}
  # Created: {{date}}
  
  - changeSet:
      id: initial-{{name}}
      author: {{author}}
      changes:
        # Add your changes here
`;
}

function getYamlReleaseChangelogTemplate() {
    return `databaseChangeLog:
  # Release Changelog: {{name}}
  # Version: {{version}}
  # Description: {{description}}
  # Created: {{date}}
  
  - changeSet:
      id: {{version}}-initial
      author: {{author}}
      changes:
        # Add your changes here
`;
}

function getYamlCustomChangelogTemplate() {
    return `databaseChangeLog:
  # Custom Changelog: {{name}}
  # Type: {{customType}}
  # Description: {{description}}
  # Created: {{date}}
  
  - changeSet:
      id: initial-{{name}}
      author: {{author}}
      changes:
        # Add your changes here
`;
}

// JSON template functions
function getJsonRootChangelogTemplate() {
    return `{
  "databaseChangeLog": [
    {
      "_comment": "Root Changelog: {{name}}",
      "_description": "{{description}}",
      "_created": "{{date}}"
    }
    /* Include your changelog files here */
  ]
}`;
}

function getJsonObjectChangelogTemplate() {
    return `{
  "databaseChangeLog": [
    {
      "_comment": "Object Changelog: {{name}}",
      "_description": "{{description}}",
      "_objectType": "{{objectType}}",
      "_created": "{{date}}"
    },
    {
      "changeSet": {
        "id": "initial-{{name}}",
        "author": "{{author}}",
        "changes": [
          /* Add your changes here */
        ]
      }
    }
  ]
}`;
}

function getJsonReleaseChangelogTemplate() {
    return `{
  "databaseChangeLog": [
    {
      "_comment": "Release Changelog: {{name}}",
      "_version": "{{version}}",
      "_description": "{{description}}",
      "_created": "{{date}}"
    },
    {
      "changeSet": {
        "id": "{{version}}-initial",
        "author": "{{author}}",
        "changes": [
          /* Add your changes here */
        ]
      }
    }
  ]
}`;
}

function getJsonCustomChangelogTemplate() {
    return `{
  "databaseChangeLog": [
    {
      "_comment": "Custom Changelog: {{name}}",
      "_type": "{{customType}}",
      "_description": "{{description}}",
      "_created": "{{date}}"
    },
    {
      "changeSet": {
        "id": "initial-{{name}}",
        "author": "{{author}}",
        "changes": [
          /* Add your changes here */
        ]
      }
    }
  ]
}`;
}

// SQL template functions
function getSqlRootChangelogTemplate() {
    return `--liquibase formatted sql

-- Root Changelog: {{name}}
-- Description: {{description}}
-- Created: {{date}}

-- Include your changelog files here
`;
}

function getSqlObjectChangelogTemplate() {
    return `--liquibase formatted sql

-- Object Changelog: {{name}}
-- Description: {{description}}
-- Object Type: {{objectType}}
-- Created: {{date}}

--changeset {{author}}:initial-{{name}}
-- Add your changes here
`;
}

function getSqlReleaseChangelogTemplate() {
    return `--liquibase formatted sql

-- Release Changelog: {{name}}
-- Version: {{version}}
-- Description: {{description}}
-- Created: {{date}}

--changeset {{author}}:{{version}}-initial
-- Add your changes here
`;
}

function getSqlCustomChangelogTemplate() {
    return `--liquibase formatted sql

-- Custom Changelog: {{name}}
-- Type: {{customType}}
-- Description: {{description}}
-- Created: {{date}}

--changeset {{author}}:initial-{{name}}
-- Add your changes here
`;
}

module.exports = {
    getTemplateContent,
    getUserTemplate,
    getBuiltInTemplate,
    fillTemplate
}; 