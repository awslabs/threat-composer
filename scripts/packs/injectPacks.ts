import fs from "fs";
import path from "path";

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

const readFileContent = (filePath: string) => {
  return fs.readFileSync(filePath, { encoding: "utf8", flag: "r" });
};

const writeFileContent = (filePath: string, content: string) => {
  return fs.writeFileSync(filePath, content);
};

const injectPackEntry = (packDefinition: string, filePaths: string[]) => {
  const fileNames: string[] = [];
  const importFiles = filePaths
    .map((filePath) => {
      const fileName = path
        .basename(filePath, path.extname(filePath))
        .replace(/[^a-zA-Z0-9]+/gm, "_");
      fileNames.push(fileName);
      const importFile = `import ${fileName} from "${filePath}";`;
      return importFile;
    })
    .join("\n");

  let updatedPackDefiniton = packDefinition
    .replace(IMPORT_PLACEHOLDER, importFiles)
    .replace(
      ENTRY_PLACEHOLDER,
      `${fileNames.map((fn) => `${fn},`).join("\n")}`
    );

  return updatedPackDefiniton;
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
      "Usage: npx ts-node ./scripts/packs/injectPacks.ts <ThreatPack|MitigationPack> <SourceDir-relative path to the relative pack folder>"
    );
    return -1;
  }

  const input = {
    type: args[lenArgs - 2],
    dir: args[lenArgs - 1],
  };

  const packFilePath =
    input.type === "ThreatPack" ? THREAT_PACKS_FILE : MITIGATION_PACKS_FILE;
  const packDefinition = readFileContent(packFilePath);

  console.log(`Pack file to be update: ${packFilePath}`);

  const packFileFolder =
    input.type === "ThreatPack" ? THREAT_PACKS_FOLDER : MITIGATION_PACKS_FOLDER;

  const importPackFolder = path.join(packFileFolder, input.dir);

  console.log(`Imported pack folder ${importPackFolder}`);

  const filePaths = listFilePaths(importPackFolder);

  const updatedPackDefiniton = injectPackEntry(packDefinition, filePaths);

  writeFileContent(packFilePath, updatedPackDefiniton);

  return 0;
};

main();
