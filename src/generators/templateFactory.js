const templates = {
  changelog: {
    xml: () => `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    CURSOR_POSITION
</databaseChangeLog>`,
    yaml: () => `databaseChangeLog:  
  CURSOR_POSITION`,
    yml: () => `databaseChangeLog:  
  CURSOR_POSITION`,
    json: () => `{
  "databaseChangeLog": [
    CURSOR_POSITION
  ]
}`,
    sql: () => `--liquibase formatted sql
CURSOR_POSITION`
  },

  changeset: {
    xml: () => `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="{{id}}" author="{{author}}">
        CURSOR_POSITION
    </changeSet>
</databaseChangeLog>`,
    yaml: () => `databaseChangeLog:
  - changeSet:
      id: {{id}}
      author: {{author}}
      changes:
        CURSOR_POSITION
`,
    yml: () => `databaseChangeLog:
  - changeSet:
      id: {{id}}
      author: {{author}}
      changes:
        CURSOR_POSITION
`,
    json: () => `{
  "databaseChangeLog": [
    {
      "changeSet": {
        "id": "{{id}}",
        "author": "{{author}}",
        "changes": [
          CURSOR_POSITION
        ]
      }
    }
  ]
}`,
    sql: () => `--liquibase formatted sql
--changeset {{author}}:{{id}}

CURSOR_POSITION
`
  }
};

function getTemplate(configFormat, type, templateData = {}) {
  const builtInTemplate = getBuiltInTemplate(configFormat, type);
  return type === 'changeset' ? fillTemplate(builtInTemplate, templateData) : builtInTemplate;
}

function getBuiltInTemplate(format, fileType) {
  const fmt = format.toLowerCase();
  const fileTemplates = templates[fileType];
  if (!fileTemplates || !fileTemplates[fmt]) return '';
  return fileTemplates[fmt]();
}

function fillTemplate(template, data) {
  let result = template;

  const flatData = {
    ...data,
    ...(data.typeDetails || {})
  };

  for (const [key, value] of Object.entries(flatData)) {
    if (typeof value === 'string' || typeof value === 'number') {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
  }

  return result;
}

module.exports = {
  getTemplate,
  getBuiltInTemplate,
  fillTemplate
};
