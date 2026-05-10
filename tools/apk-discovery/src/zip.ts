import { inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string;
  body: Buffer;
}

export function readZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    throw new Error('Malformed APK zip: end of central directory not found.');
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('Malformed APK zip: central directory entry is invalid.');
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');

    entries.push({
      name,
      body: readLocalFile(buffer, localHeaderOffset, compressionMethod, compressedSize)
    });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readLocalFile(buffer: Buffer, localHeaderOffset: number, compressionMethod: number, compressedSize: number): Buffer {
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error('Malformed APK zip: local file header is invalid.');
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const bodyStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressedBody = buffer.subarray(bodyStart, bodyStart + compressedSize);

  if (compressionMethod === 0) {
    return Buffer.from(compressedBody);
  }
  if (compressionMethod === 8) {
    return inflateRawSync(compressedBody);
  }

  throw new Error(`Unsupported APK zip compression method: ${compressionMethod}.`);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}
