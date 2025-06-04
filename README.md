# Liquibase Plugin for VS Code

This Visual Studio Code extension simplifies working with Liquibase by automating routine tasks and enhancing the user experience.

## Getting Started

### Setup Wizard

After installing the extension, launch the setup wizard to configure your environment:

1. Press `Ctrl+Shift+P` or click the Liquibase icon in the status bar
2. Run the command **Liquibase: Run Full Setup Wizard**
3. Follow the prompts to configure:
   - Path to your `liquibase.properties` file
   - Main (parent) changelog file
   - Default file formats for changelogs and changesets
   - Naming patterns for generated files
   - Default author name

### Creating a Changelog

1. Right-click the folder where you'd like to create a changelog  
2. Select **Liquibase: Create Changelog**  
3. The changelog file will be created and opened. If a parent changelog is configured, it will be updated automatically.

### Creating a Changeset

1. Right-click the folder where you'd like to create a changeset  
2. Select **Liquibase: Create Changeset**  
3. Enter required values based on your naming pattern  
4. Choose a changelog to associate the new changeset with (optional)  
5. Choose **Yes** if you want to link all changesets in the folder to this changelog  
6. The new changeset will be created and opened, along with the associated changelog

### Previewing SQL

1. Open a changeset file  
2. Press `Ctrl+Shift+P` or click the Liquibase icon in the status bar  
3. Select **Liquibase: Generate SQL for Changeset**  
4. Choose the target changeset from the dropdown list  
5. Select the SQL type:
   - **Full SQL** – generates all SQL statements, including context or environment-related commands  
   - **Short SQL** – generates only SQL directly related to the selected changeset  
6. The generated SQL will open in a new editor tab


## Configuration

You can configure the extension in one of the following ways:

- Open **File > Preferences > Settings** or press `Ctrl+,` and search for **Liquibase**
- Run **Liquibase: Plugin Settings** from the command palette

## Supported Variables in Naming Patterns

Use the following placeholders in naming templates:

- `{author}` – Author name  
- `{date}` – Current date in the selected format (moment.js)
- `{name}` – Name for the migration
- `{ext}` – File extension (based on selected format)  
- `{object}` – Object name (for object-oriented patterns)  
- `{release}` – Release version (for release-based workflows)

## Requirements

- Visual Studio Code 1.96.0 or later  
- Liquibase must be installed and available in the system environment
- A valid `liquibase.properties` file is required to generate SQL previews

## Release Notes

### 0.0.1

- Initial release with core features:
  - Support for XML, YAML, and JSON changelog formats
  - Changelog and changeset creation
  - SQL generation and preview
