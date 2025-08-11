import fs from "fs";
import path from "path";
import { z } from "zod";
import { DataExchangeFormatSchema } from "../packages/threat-composer/src/customTypes/dataExchange";

/**
 * Generate JSON Schema from Zod schema definition.
 * Usage: npx ts-node --compiler-options '{"lib":["es2019","dom"]}' scripts/generateSchema.ts
 * 
 * Note: DOM types are required because the source dataExchange.ts file contains 
 * interfaces that reference DOM types like CustomEvent.
 */

const SCHEMAS_PATH = path.join(__dirname, "..", "schemas");

/**
 * Extract schema version from the Zod schema definition
 * @returns Schema version number
 */
const getSchemaVersion = (): number => {
  // The schema field is defined as z.number().max(1)
  // We can access the maxValue directly from the ZodNumber instance
  const maxValue = DataExchangeFormatSchema.shape.schema.maxValue;
  if (maxValue === null || maxValue === undefined) {
    throw new Error("Could not determine schema version from Zod schema definition");
  }
  return maxValue;
};

/**
 * Main function to generate schema
 */
const main = (): void => {
  try {
    console.log("Generating JSON Schema from Threat Composer data exchange format...");
    
    // Get version from schema definition
    const version = getSchemaVersion();
    console.log(`Detected schema version: ${version}`);

    // Generate JSON Schema using Zod's native method
    const jsonSchema = z.toJSONSchema(DataExchangeFormatSchema);

    // Ensure schemas directory exists
    if (!fs.existsSync(SCHEMAS_PATH)) {
      console.log(`Creating schemas directory: ${SCHEMAS_PATH}`);
      fs.mkdirSync(SCHEMAS_PATH, { recursive: true });
    }

    // Write schema file
    const outputFileName = `threat-composer-v${version}.schema.json`;
    const outputPath = path.join(SCHEMAS_PATH, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));

    console.log(`Schema successfully generated at: ${outputPath}`);
  } catch (error) {
    console.error("Error generating schema:", (error as Error).message);
    process.exit(1);
  }
};

main();
