import fs from "fs";
import path from "path";

/**
 * Build packs from pack metadata json files.
 * Usage: npx ts-node ./scripts/data/buildPacks.ts <ThreatPack|MitigationPack> <SourceDir-relative path to the relative data folder> <DestDir-relative path to the relative data folder>
 */

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

const MITIGATION_PACKS_FOLDER = path.join(DATA_FOLDER, "mitigationPacks");

const GENERATED_FILES_FOLDER_NAME = "generated";

const PACK_FOLDER = {
  ThreatPack: THREAT_PACKS_FOLDER,
  MitigationPack: MITIGATION_PACKS_FOLDER,
};

const THREAT_PACK_BASE = {
  schema: 1,
  namespace: "threat-composer",
  type: "threat-pack",
};

const MITIGATION_PACK_BASE = {
  schema: 1,
  namespace: "threat-composer",
  type: "mitigation-pack",
};

type PackType = "ThreatPack" | "MitigationPack";

const getPackContent = (
  packType: PackType,
  metadataContent: any,
  sourceContent: any
) => {
  if (packType === "ThreatPack") {
    const threats = sourceContent.threats;
    const mitigationLinks = sourceContent.mitigationLinks.filter((x: any) =>
      threats.map((t: any) => t.id).includes(x.linkedId)
    );
    const mitigations = sourceContent.mitigations.filter((x: any) =>
      mitigationLinks.map((ml: any) => ml.mitigationId).includes(x.id)
    );

    return {
      ...THREAT_PACK_BASE,
      id: metadataContent.id,
      name: metadataContent.name,
      description: metadataContent.description,
      threats: threats,
      mitigationLinks,
      mitigations,
    };
  }

  return {
    ...MITIGATION_PACK_BASE,
    id: metadataContent.id,
    name: metadataContent.name,
    description: metadataContent.description,
    mitigations: sourceContent.mitigations,
  };
};

const processFile = (
  filePath: string,
  sourceDir: string,
  destDir: string,
  packType: PackType
) => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const jsonContent = JSON.parse(fileContent);
  const sourceFilePath = path.join(sourceDir, jsonContent.path);

  const sourceFileContent = fs.readFileSync(sourceFilePath, "utf-8");
  const sourceContent = JSON.parse(sourceFileContent);

  const packContent = getPackContent(packType, jsonContent, sourceContent);

  const generateFilePath = path.join(
    destDir,
    `${path.basename(filePath, ".metadata.json")}.json`
  );

  console.log(`Writing ${packType} file: ${generateFilePath}`);

  fs.writeFileSync(generateFilePath, JSON.stringify(packContent, null, 2));

  return generateFilePath;
};

const generatePacksFromMetaDatafiles = (
  sourceDir: string,
  destDir: string,
  packType: PackType
) => {
  const files = fs.readdirSync(sourceDir);
  files.forEach((file) => {
    const filePath = path.join(sourceDir, file);
    if (file.endsWith("metadata.json")) {
      try {
        console.log(`Processing file ${filePath}`);
        const generateFilePath = processFile(
          filePath,
          sourceDir,
          destDir,
          packType
        );
        console.log(`Generated ${packType} file: ${generateFilePath}`);
      } catch (e) {
        console.log(`Error processing file ${filePath}`, e);
      }
    }
  });
};

const mkdirIfNotExist = (destDir: string) => {
  if (!fs.existsSync(destDir)) {
    console.log(`Creating folder for ${destDir}`);
    fs.mkdirSync(destDir, { recursive: true });
  }
};

const main = () => {
  const args = process.argv;

  console.log("Arguments", args);

  const lenArgs = args.length;

  if (lenArgs < 3) {
    console.log(
      "Usage: npx ts-node ./scripts/data/buildPacks.ts <ThreatPack|MitigationPack> <SourceDir-relative path to the relative data folder> <DestDir-relative path to the relative data folder>"
    );
    return -1;
  }

  const input = {
    type: args[2],
    sourceDir: lenArgs > 3 ? args[3] : ".",
    destDir: lenArgs > 4 ? args[4] : GENERATED_FILES_FOLDER_NAME,
  };

  console.log("buildPacks params", input);

  const packFolder = PACK_FOLDER[input.type as PackType];

  if (!packFolder) {
    console.error(`Invalid data type ${input.type}`);
  }

  const sourceDir = path.join(packFolder, input.sourceDir);
  const destDir = path.join(packFolder, input.destDir);

  mkdirIfNotExist(destDir);
  generatePacksFromMetaDatafiles(sourceDir, destDir, input.type as PackType);

  return 0;
};

main();
