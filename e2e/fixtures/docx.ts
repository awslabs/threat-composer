/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
// Named import rather than a default import of the module object: unambiguous
// under both ESM and any CommonJS interop setting, which matters because this
// fixture is also compiled standalone by the reader's own checks.
import { inflateRawSync } from 'node:zlib';
import zlib from 'node:zlib';

/**
 * `zlib.crc32` exists from Node 20.15 but is absent from the `@types/node` this
 * package resolves, so it cannot be imported by name without a type error.
 * Reached through an explicit optional shape instead of widening to `any`, which
 * keeps the call site type checked and makes the runtime guard below honest:
 * the value really can be undefined, on an older Node.
 */
const crc32: ((data: Buffer) => number) | undefined = (
  zlib as unknown as { crc32?: (data: Buffer) => number }
).crc32;

/**
 * Just enough ZIP reading to prove a downloaded .docx would actually open.
 *
 * A .docx is an OOXML package: a ZIP containing `[Content_Types].xml`, a
 * `_rels/.rels` relationship graph, and `word/document.xml` holding the body.
 * Checking the first two bytes are `PK` only proves the file is *some* zip. A
 * truncated download, a zip missing the document part, or a corrupt deflate
 * stream all pass that check and none of them open in Word.
 *
 * Deliberately dependency-free. This package intentionally carries only
 * Playwright and TypeScript, and `zlib` is standard library, so one assertion
 * does not need to buy a zip library that the pnpm migration would then have to
 * carry forward. Shelling out to `unzip` was the other option and was rejected
 * for assuming a binary that is absent on Windows.
 *
 * Only the subset of the ZIP format that OOXML actually uses is implemented:
 * stored and deflated entries, no encryption, no ZIP64. If the exporter ever
 * produces something outside that, these helpers throw rather than quietly
 * passing.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const STORED = 0;
const DEFLATED = 8;

export interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  crc32: number;
}

/**
 * Locate the End of Central Directory record.
 *
 * It sits at the very end of the file, but a trailing comment of up to 65535
 * bytes may follow it, so the signature has to be searched for backwards rather
 * than read from a fixed offset.
 */
const findEndOfCentralDirectory = (buffer: Buffer): number => {
  const earliest = Math.max(0, buffer.length - (22 + 0xffff));
  for (let offset = buffer.length - 22; offset >= earliest; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }
  throw new Error(
    'not a zip archive: no End of Central Directory record found. ' +
      'A truncated download looks exactly like this.',
  );
};

/** Every entry the archive declares, read from the central directory. */
export const listZipEntries = (buffer: Buffer): ZipEntry[] => {
  const eocd = findEndOfCentralDirectory(buffer);
  const expectedCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  for (let index = 0; index < expectedCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new Error(
        `corrupt central directory: entry ${index} has no header signature`,
      );
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push({
      name: buffer.toString('utf8', offset + 46, offset + 46 + nameLength),
      compressionMethod: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      uncompressedSize: buffer.readUInt32LE(offset + 24),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
      crc32: buffer.readUInt32LE(offset + 16),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

/**
 * Decompress one named entry.
 *
 * Reads the local header rather than trusting the central directory's offsets
 * alone, because a zip whose two directories disagree is corrupt in a way worth
 * failing on.
 */
export const readZipEntry = (buffer: Buffer, name: string): Buffer => {
  const entry = listZipEntries(buffer).find((candidate) => candidate.name === name);
  if (!entry) {
    throw new Error(`entry not found in archive: ${name}`);
  }
  const header = entry.localHeaderOffset;
  if (buffer.readUInt32LE(header) !== LOCAL_SIGNATURE) {
    throw new Error(`corrupt local header for ${name}`);
  }
  const nameLength = buffer.readUInt16LE(header + 26);
  const extraLength = buffer.readUInt16LE(header + 28);
  const start = header + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + entry.compressedSize);

  let inflated: Buffer;
  if (entry.compressionMethod === STORED) {
    inflated = Buffer.from(compressed);
  } else if (entry.compressionMethod === DEFLATED) {
    // Throws on a corrupt stream, which is the point: a damaged document part
    // should fail loudly rather than yield garbage.
    inflated = inflateRawSync(compressed);
  } else {
    throw new Error(
      `unsupported compression method ${entry.compressionMethod} for ${name}`,
    );
  }

  // Verify the checksum the writer recorded. Without this, stored entries get no
  // integrity check whatsoever, since there is no decompression step to fail:
  // a real .docx keeps [Content_Types].xml and _rels/.rels stored and only
  // deflates the document body, so most of the package would go unverified.
  //
  // Guarded because zlib.crc32 arrived in Node 20.15, and the repository's
  // engines allow older. Skipping the check on an old runtime is preferable to
  // shipping a second CRC implementation to keep in step with the first.
  if (typeof crc32 === 'function') {
    const actual = crc32(inflated);
    if (actual !== entry.crc32) {
      throw new Error(
        `checksum mismatch for ${name}: archive records ` +
          `0x${entry.crc32.toString(16)} but the data hashes to ` +
          `0x${actual.toString(16)}. The file is corrupt.`,
      );
    }
  }

  if (inflated.length !== entry.uncompressedSize) {
    throw new Error(
      `size mismatch for ${name}: archive records ${entry.uncompressedSize} ` +
        `bytes but ${inflated.length} were recovered`,
    );
  }

  return inflated;
};

/** The parts every OOXML word processing document must contain to open. */
export const REQUIRED_DOCX_ENTRIES = [
  '[Content_Types].xml',
  '_rels/.rels',
  'word/document.xml',
] as const;

export interface OpenedDocx {
  entries: string[];
  documentXml: string;
  paragraphCount: number;
}

/**
 * Open a .docx the way a word processor would, and fail with something useful
 * if it cannot be opened.
 *
 * Returns the inflated document body so callers can assert on content, rather
 * than only on structure.
 */
export const openDocx = (buffer: Buffer): OpenedDocx => {
  const entries = listZipEntries(buffer).map((entry) => entry.name);

  const missing = REQUIRED_DOCX_ENTRIES.filter((required) => !entries.includes(required));
  if (missing.length > 0) {
    throw new Error(
      `not a usable .docx: missing ${missing.join(', ')}.\n` +
        `Archive contains ${entries.length} entries: ${entries.join(', ')}`,
    );
  }

  const documentXml = readZipEntry(buffer, 'word/document.xml').toString('utf8');

  if (!documentXml.startsWith('<?xml')) {
    throw new Error('word/document.xml does not begin with an XML declaration');
  }
  // A truncated inflate would give a prefix without the closing tag, so
  // requiring both ends is a cheap well-formedness check without a parser.
  if (!/<w:document[\s>]/.test(documentXml) || !documentXml.includes('</w:document>')) {
    throw new Error(
      'word/document.xml is not a complete WordprocessingML document ' +
        '(no balanced <w:document> root)',
    );
  }

  return {
    entries,
    documentXml,
    // Paragraph count stands in for "has real content", without depending on
    // any particular wording that the app might legitimately change. Matches
    // `<w:p>`, `<w:p attr=...>` and the self-closing `<w:p/>` that an empty
    // paragraph produces, but not `<w:pPr>` and friends.
    paragraphCount: (documentXml.match(/<w:p[\s/>]/g) ?? []).length,
  };
};
