# Threat Composer CLI

A command-line interface for AWS Threat Composer.

## Installation

```bash
npm install -g @aws/threat-composer-cli
```

## Usage

```
threat-composer-cli [command] [options]
```

### Commands

#### Validate

Validate a threat model JSON file or input from STDIN:

```bash
# Validate a file
threat-composer-cli validate path/to/threatmodel.json

# Validate from STDIN
cat path/to/threatmodel.json | threat-composer-cli validate
```

Options:
- `--type <type>`: Type of validation to perform (default: "threatmodel")
  - Currently only "threatmodel" is supported

#### Convert

Convert a threat model JSON to markdown:

```bash
# Convert a file to markdown and output to STDOUT
threat-composer-cli convert path/to/threatmodel.json

# Convert a file to markdown and save to a file
threat-composer-cli convert path/to/threatmodel.json --output path/to/output.md

# Convert from STDIN and output to STDOUT
cat path/to/threatmodel.json | threat-composer-cli convert

# Convert from STDIN and save to a file
cat path/to/threatmodel.json | threat-composer-cli convert --output path/to/output.md
```

Options:
- `--format <format>`: Output format (default: "markdown")
  - Currently only "markdown" is supported
- `--output <file>`: Output file path (if not specified, outputs to STDOUT)

### Future Commands

The following commands are planned for future releases:

#### Additional Validation Types

- `validate-threat`: Validate a threat statement JSON
- `validate-mitigation`: Validate a mitigation statement JSON
- `validate-assumption`: Validate an assumption statement JSON
- `validate-threatpack`: Validate a threat pack JSON
- `validate-mitigationpack`: Validate a mitigation pack JSON

#### Additional Conversion Formats

- `convert-pdf`: Convert a threat model JSON to PDF
- `convert-docx`: Convert a threat model JSON to DOCX

#### CRUD Operations

- `create`: Create a new entity
- `read`: Read/view an entity
- `update`: Update an existing entity
- `delete`: Delete an entity

## Examples

### Validate a threat model

```bash
threat-composer-cli validate examples/threatmodel.json
```

### Convert a threat model to markdown

```bash
threat-composer-cli convert examples/threatmodel.json --output threatmodel.md
```

### Pipeline usage

```bash
cat examples/threatmodel.json | threat-composer-cli validate && cat examples/threatmodel.json | threat-composer-cli convert > threatmodel.md
```
