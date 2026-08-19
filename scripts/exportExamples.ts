import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Export the built-in threat statement examples with their rendered statement text.
 * Usage: tsx ./scripts/exportExamples.ts
 *
 * Reads from the compiled output of packages/threat-composer, so run the build first.
 */

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LIB_PATH = path.join(SCRIPT_DIR, '..', 'packages', 'threat-composer', 'lib');
const OUTPUT_PATH = path.join(SCRIPT_DIR, '.temp');
const OUTPUT_FILE_NAME = 'threatStatementExamples.json';

interface ThreatStatementExample {
  [key: string]: unknown;
}

type RenderThreatStatement = (statement: ThreatStatementExample) => { statement: string };

const modulePath = path.join(LIB_PATH, 'utils', 'renderThreatStatement', 'index.js');
const dataPath = path.join(LIB_PATH, 'data', 'threatStatementExamples.json');

if (!fs.existsSync(modulePath)) {
  console.error(
    `Could not find ${modulePath}. Build packages/threat-composer first (yarn build).`,
  );
  process.exit(1);
}

const { default: renderThreatStatement } = (await import(
  pathToFileURL(modulePath).href
)) as { default: RenderThreatStatement };

const data = JSON.parse(
  fs.readFileSync(dataPath, 'utf-8'),
) as ThreatStatementExample[];

const output = data.map((th) => {
  const { statement } = renderThreatStatement(th);
  return {
    statement,
    ...th,
  };
});

if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

const outputPath = path.join(OUTPUT_PATH, OUTPUT_FILE_NAME);

fs.writeFileSync(outputPath, JSON.stringify(output, undefined, 2));

console.log('The example file is export to', outputPath);
