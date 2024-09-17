import fs from "fs";
import path from "path";

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

type PackType = "ThreatPacks" | "MitigationPacks";

const getPackContent = (
  packType: PackType,
  metadataContent: any,
  sourceContent: any
) => {
  if (packType === "ThreatPacks") {
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
  packFolder: string,
  packType: PackType
) => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const jsonContent = JSON.parse(fileContent);
  const sourceFilePath = path.join(packFolder, jsonContent.path);

  const sourceFileContent = fs.readFileSync(sourceFilePath, "utf-8");
  const sourceContent = JSON.parse(sourceFileContent);

  const packContent = getPackContent(packType, jsonContent, sourceContent);

  const generateFilePath = path.join(
    packFolder,
    GENERATED_FILES_FOLDER_NAME,
    `${path.basename(filePath, ".metadata.json")}.json`
  );

  fs.writeFileSync(generateFilePath, JSON.stringify(packContent, null, 2));

  return generateFilePath;
};

const generatePacksFromMetaDatafiles = (
  packFolder: string,
  packType: PackType
) => {
  const files = fs.readdirSync(packFolder);
  files.forEach((file) => {
    const filePath = path.join(packFolder, file);
    if (file.endsWith("metadata.json")) {
      try {
        console.log(`Processing file ${filePath}`);
        const generateFilePath = processFile(filePath, packFolder, packType);
        console.log(`Generated ${packType} file: ${generateFilePath}`);
      } catch (e) {
        console.log(`Error processing file ${filePath}`, e);
      }
    }
  });
};

generatePacksFromMetaDatafiles(THREAT_PACKS_FOLDER, "ThreatPacks");
generatePacksFromMetaDatafiles(MITIGATION_PACKS_FOLDER, "MitigationPacks");
