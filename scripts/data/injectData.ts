import fs from "fs";
import path from "path";

/**
 * Inject data into threat ThreatPack/MitigationPack/WorkspaceExample dynamically in build time.
 * Usage: npx ts-node ./scripts/data/injectData.ts <ThreatPack|MitigationPack|WorkspaceExample> <SourceDir-relative path to the relative data folder>
 */

const IMPORT_PLACEHOLDER = "// {IMPORT_PLACEHOLDER}";
const ENTRY_PLACEHOLDER = "// {ENTRY_PLACEHOLDER}";

const DATA_FOLDER = path.join(
  __dirname,
  "..",
  "..",
  "packages",
  "threat-composer",
  "src",
  "data"
);

const THREAT_PACKS_FOLDER = path.join(DATA_FOLDER, "threatPacks");

const THREAT_PACKS_FILE = path.join(THREAT_PACKS_FOLDER, "threatPacks.ts");

const MITIGATION_PACKS_FOLDER = path.join(DATA_FOLDER, "mitigationPacks");

const MITIGATION_PACKS_FILE = path.join(
  MITIGATION_PACKS_FOLDER,
  "mitigationPacks.ts"
);

const WORKSPACE_EXAMPLE_FOLDER = path.join(DATA_FOLDER, "workspaceExamples");

const WORKSPACE_EXAMPLE_FILE = path.join(
  WORKSPACE_EXAMPLE_FOLDER,
  "workspaceExamples.ts"
);

type DataType = "ThreatPack" | "MitigationPack" | "WorkspaceExample";

const CONFIG_DATA_FOLDER = {
  ThreatPack: THREAT_PACKS_FOLDER,
  MitigationPack: MITIGATION_PACKS_FOLDER,
  WorkspaceExample: WORKSPACE_EXAMPLE_FOLDER,
};

const CONFIG_FILE_PATH = {
  ThreatPack: THREAT_PACKS_FILE,
  MitigationPack: MITIGATION_PACKS_FILE,
  WorkspaceExample: WORKSPACE_EXAMPLE_FILE,
};

const readFileContent = (filePath: string) => {
  return fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
};

const writeFileContent = (filePath: string, content: string) => {
  return fs.writeFileSync(filePath, content);
};

const removeExt = (filePath: string) => {
  let fileName = path.basename(filePath);
  while (fileName.indexOf(".") >= 0) {
    fileName = path.basename(fileName, path.extname(fileName));
  }

  return fileName;
};

const injectDataEntry = (
  dataType: DataType,
  dataConfig: string,
  filePaths: string[]
) => {
  const fileNames: string[] = [];
  const importFiles = filePaths
    .map((filePath) => {
      const fileName = removeExt(filePath).replace(/[^a-zA-Z0-9]+/gm, "_");
      fileNames.push(fileName);
      const importFile = `import ${fileName} from "${filePath}";`;
      return importFile;
    })
    .join("\n");

  let updatedDataConfig = dataConfig
    .replace(IMPORT_PLACEHOLDER, `${importFiles}\n${IMPORT_PLACEHOLDER}`)
    .replace(
      ENTRY_PLACEHOLDER,
      `${fileNames
        .map((fn) => {
          if (dataType === "WorkspaceExample") {
            return `{ name: '${fn}', value: ${fn}, },`;
          }

          return `${fn},`;
        })
        .join("\n")}\n${ENTRY_PLACEHOLDER}`
    );

  return updatedDataConfig;
};

const listFilePaths = (dir: string) => {
  const filePaths: string[] = [];

  fs.readdirSync(dir).forEach((x) => {
    const filePath = path.join(dir, x);
    if (fs.lstatSync(filePath).isDirectory()) {
      filePaths.push(...listFilePaths(filePath));
    }

    if (x.endsWith(".json")) {
      filePaths.push(filePath);
    }
  });

  return filePaths;
};

const main = () => {
  const args = process.argv;

  console.log("Arguments", args);

  const lenArgs = args.length;

  if (lenArgs !== 4) {
    console.log(
      "Usage: npx ts-node ./scripts/data/injectData.ts <ThreatPack|MitigationPack|WorkspaceExample> <SourceDir-relative path to the relative data folder>"
    );
    return -1;
  }

  const input = {
    type: args[lenArgs - 2],
    dir: args[lenArgs - 1],
  };

  const configFilePath = CONFIG_FILE_PATH[input.type as DataType];

  if (!configFilePath) {
    console.error(`Invalid data type ${input.type}`);
    return -1;
  }

  console.log(`Config file to be update: ${configFilePath}`);
  const dataConfig = readFileContent(configFilePath);

  const configDataFolder = CONFIG_DATA_FOLDER[input.type as DataType];

  if (!configDataFolder) {
    console.error(`Invalid data type ${input.type}`);
    return -1;
  }

  const importDataFolder = path.join(configDataFolder, input.dir);

  console.log(`Imported data folder ${importDataFolder}`);

  const filePaths = listFilePaths(importDataFolder);

  const updatedDataConfig = injectDataEntry(
    input.type as DataType,
    dataConfig,
    filePaths
  );

  writeFileContent(configFilePath, updatedDataConfig);

  return 0;
};

main();
