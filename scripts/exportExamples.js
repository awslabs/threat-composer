const path = require('path');
const fs = require('fs');

const PACKAGE_PATH = path.join(__dirname, '..', 'packages', 'threat-statement-generator');
const SCRIPT_PATH = path.join(PACKAGE_PATH, 'lib', 'utils', 'renderThreatStatement');
const DATA_PATH = path.join(PACKAGE_PATH, 'lib', 'data', 'threatStatementExamples.json');
const OUTPUT_PATH = path.join(__dirname, '.temp');
const OUTPUT_FILE_NAME = 'threatStatementExamples.json';

const renderThreatStatement = require(SCRIPT_PATH);
const data = require(DATA_PATH);

const output = [];
data.forEach((th) => {
  const { statement } = renderThreatStatement.default(th);
  output.push({
    statement,
    ...th,
  });
});

if(!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH);
}

const outputData = JSON.stringify(output, undefined, 2);
const outputPath = path.join(OUTPUT_PATH, OUTPUT_FILE_NAME);

fs.writeFileSync(outputPath, outputData);

console.log('The example file is export to', outputPath);