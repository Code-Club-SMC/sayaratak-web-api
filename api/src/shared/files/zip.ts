import { Buffer } from "node:buffer"
import type { Readable } from "node:stream"
import { type Entry, fromBuffer, type ZipFile } from "yauzl"

import { ApiError } from "~/shared/http/errors"

import {
  checkZipEntry,
  checkZipStructure,
  invalidZip,
  ZIP_ENTRY_MAX_BYTES,
  ZIP_EXPANDED_MAX_BYTES,
} from "./zip-metadata"

export type SeedArchiveEntry = {
  filename: string
  compressedSize: number
  expandedSize: number
  crc32: number
  externalAttributes: number
  read(): Promise<Uint8Array<ArrayBuffer>>
}
export type SeedArchive = {
  entries(): AsyncIterable<SeedArchiveEntry>
  close(): void
}

/** Preflights every central/local header before allowing any decompression. */
export async function openSeedArchive(
  bytes: Uint8Array<ArrayBuffer>
): Promise<SeedArchive> {
  const structure = checkZipStructure(bytes)
  const zip = await openZip(bytes)
  const streams = new Set<Readable>()
  let error: Error | undefined
  zip.on("error", (caught: Error) => {
    error = caught
    for (const stream of streams) stream.destroy(caught)
  })
  try {
    const entries = await preflight(zip, structure)
    return archiveHandle({ zip, entries, streams }, () => error)
  } catch (caught) {
    zip.close()
    throw caught
  }
}

function archiveHandle(
  input: { zip: ZipFile; entries: Entry[]; streams: Set<Readable> },
  error: () => Error | undefined
): SeedArchive {
  let expandedBytes = 0
  const consume = (bytes: number) => {
    expandedBytes += bytes
    if (expandedBytes > ZIP_EXPANDED_MAX_BYTES) invalidZip()
  }
  return {
    async *entries() {
      for (const entry of input.entries) {
        if (error() || !input.zip.isOpen) invalidZip()
        yield {
          filename: entry.fileName,
          compressedSize: entry.compressedSize,
          expandedSize: entry.uncompressedSize,
          crc32: entry.crc32,
          externalAttributes: entry.externalFileAttributes,
          async read() {
            return readEntry(input.zip, entry, {
              streams: input.streams,
              consume,
            })
          },
        }
      }
    },
    close() {
      for (const stream of input.streams) stream.destroy()
      input.zip.close()
    },
  }
}

function openZip(bytes: Uint8Array<ArrayBuffer>): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    fromBuffer(
      Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      {
        lazyEntries: true,
        strictFileNames: true,
        decodeStrings: true,
        validateEntrySizes: true,
        autoClose: false,
      },
      (error, zip) => (error ? reject(error) : resolve(zip))
    )
  })
}

async function preflight(
  zip: ZipFile,
  structure: { count: number; offset: number }
) {
  const entries: Entry[] = []
  const names = new Set<string>()
  let expanded = 0
  let previousEnd = 0
  for (let index = 0; index < structure.count; index++) {
    const entry = await nextEntry(zip)
    checkZipEntry(entry, names)
    expanded += entry.uncompressedSize
    if (expanded > ZIP_EXPANDED_MAX_BYTES) invalidZip()
    const start = await localDataStart(zip, entry)
    if (entry.relativeOffsetOfLocalHeader < previousEnd) invalidZip()
    previousEnd = start + entry.compressedSize
    if (previousEnd > structure.offset) invalidZip()
    entries.push(entry)
  }
  return entries
}

function nextEntry(zip: ZipFile): Promise<Entry> {
  return new Promise((resolve, reject) => {
    const failed = (error: Error) => {
      cleanup()
      reject(error)
    }
    const found = (entry: Entry) => {
      cleanup()
      resolve(entry)
    }
    const cleanup = () => {
      zip.off("error", failed)
      zip.off("entry", found)
    }
    zip.once("error", failed)
    zip.once("entry", found)
    zip.readEntry()
  })
}

function localDataStart(zip: ZipFile, entry: Entry): Promise<number> {
  return new Promise((resolve, reject) => {
    zip.readLocalFileHeader(entry, (error, header) => {
      if (error) return reject(error)
      if (
        header.fileName.toString("utf8") !== entry.fileName ||
        header.compressionMethod !== entry.compressionMethod ||
        header.generalPurposeBitFlag !== entry.generalPurposeBitFlag ||
        (!(entry.generalPurposeBitFlag & 8) &&
          (header.crc32 !== entry.crc32 ||
            header.compressedSize !== entry.compressedSize ||
            header.uncompressedSize !== entry.uncompressedSize))
      )
        return reject(
          new ApiError("validation", { archive: "validation.seed_archive" })
        )
      resolve(header.fileDataStart)
    })
  })
}

async function readEntry(
  zip: ZipFile,
  entry: Entry,
  input: {
    streams: Set<Readable>
    consume(bytes: number): void
  }
) {
  const stream = await new Promise<Readable>((resolve, reject) => {
    zip.openReadStream(entry, (error, value) =>
      error ? reject(error) : resolve(value)
    )
  })
  input.streams.add(stream)
  const chunks: Buffer[] = []
  let length = 0
  try {
    for await (const chunk of stream) {
      if (!Buffer.isBuffer(chunk)) invalidZip()
      length += chunk.byteLength
      if (length > ZIP_ENTRY_MAX_BYTES) invalidZip()
      input.consume(chunk.byteLength)
      chunks.push(chunk)
    }
    const output = new Uint8Array(Buffer.concat(chunks, length))
    if (
      length !== entry.uncompressedSize ||
      Bun.hash.crc32(output) !== entry.crc32
    )
      invalidZip()
    return output
  } finally {
    input.streams.delete(stream)
    stream.destroy()
  }
}
