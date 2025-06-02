const ChangelogGenerator = require('./generators/ChangelogGenerator');
const ChangesetGenerator = require('./generators/ChangesetGenerator');
const SetupWizard = require('./wizard/SetupWizard');
const PreviewSql = require('./sql/PreviewSql');

// Создаём экземпляры команд
const commands = [
  new ChangelogGenerator({}),
  new ChangesetGenerator({}),
  new SetupWizard(),
  new PreviewSql(),
];

module.exports = {
  commands
};
