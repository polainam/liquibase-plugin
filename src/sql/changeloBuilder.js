const yaml = require('js-yaml');
const xml2js = require('xml2js');
const path = require('path');
const { findChangeset } = require('./extractors/extractorFactory');

async function buildTempChangelog(content, changesetInfo, filePath, isYaml, isJson) {
  if (isYaml) {
    /** @type {any} */
    const parsedYaml = yaml.load(content);
    if (!parsedYaml?.databaseChangeLog || !Array.isArray(parsedYaml.databaseChangeLog)) {
      throw new Error('Invalid YAML changelog format');
    }

    const changeset = await findChangeset(content, changesetInfo.id, changesetInfo.author, filePath);
    if (!changeset) {
      throw new Error(`Changeset not found: id=${changesetInfo.id}, author=${changesetInfo.author}`);
    }

    const tempYaml = { databaseChangeLog: [ { changeSet: changeset } ] };
    return { tempContent: yaml.dump(tempYaml), extension: path.extname(filePath) };

  } else if (isJson) {
    const parsedJson = JSON.parse(content);
    if (!parsedJson?.databaseChangeLog || !Array.isArray(parsedJson.databaseChangeLog)) {
      throw new Error('Invalid JSON changelog format');
    }

    const changeset = await findChangeset(content, changesetInfo.id, changesetInfo.author, filePath);
    if (!changeset) {
      throw new Error(`Changeset not found: id=${changesetInfo.id}, author=${changesetInfo.author}`);
    }

    const tempJson = { databaseChangeLog: [ { changeSet: changeset } ] };
    return { tempContent: JSON.stringify(tempJson, null, 2), extension: '.json' };

  } else {
    // XML case
    const parsed = await xml2js.parseStringPromise(content);
    if (!parsed.databaseChangeLog) {
      throw new Error('Invalid XML changelog format');
    }

    const changeSets = parsed.databaseChangeLog.changeSet || [];
    const match = changeSets.find(cs => cs.$.id === changesetInfo.id && cs.$.author === changesetInfo.author);
    if (!match) {
      throw new Error(`Changeset not found: id=${changesetInfo.id}, author=${changesetInfo.author}`);
    }

    const namespaces = { ...parsed.databaseChangeLog.$ };
    const builder = new xml2js.Builder();
    const tempChangeLog = { databaseChangeLog: { $: namespaces, changeSet: [match] } };

    return { tempContent: builder.buildObject(tempChangeLog), extension: '.xml' };
  }
}

module.exports = { buildTempChangelog };
