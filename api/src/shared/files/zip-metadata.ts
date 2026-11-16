import type { Entry } from "yauzl"

import { fail } from "~/shared/http/errors"

export const ZIP_MAX_BYTES = 25 * 1024 * 1024
export const ZIP_ENTRY_MAX_BYTES = 2 * 1024 * 1024
export const ZIP_EXPANDED_MAX_BYTES = 100 * 1024 * 1024
export const ZIP_MAX_ENTRIES = 50
const END_SIZE = 22
const END_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const UNIX_FILE_TYPE = 0xf000
const UNIX_REGULAR_FILE = 0x8000

/** Only ordinary single-disk ZIP, without ZIP64, prefixes, or trailing payloads. */
export function checkZipStructure(bytes: Uint8Array<ArrayBuffer>) {
  if (bytes.length < END_SIZE || bytes.length > ZIP_MAX_BYTES) invalidZip()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - END_SIZE
  if (view.getUint32(end, true) !== END_SIGNATURE) invalidZip()
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    invalidZip()
  const count = view.getUint16(end + 10, true)
  if (count < 1 || count > ZIP_MAX_ENTRIES) invalidZip()
  if (view.getUint16(end + 8, true) !== count) invalidZip()
  return checkDirectoryBounds(view, { end, count })
}

function checkDirectoryBounds(
  view: DataView,
  input: { end: number; count: number }
) {
  const { end, count } = input
  const offset = view.getUint32(end + 16, true)
  const size = view.getUint32(end + 12, true)
  if (offset + size !== end || offset < 30) invalidZip()
  if (view.getUint32(0, true) !== LOCAL_SIGNATURE) invalidZip()
  if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) invalidZip()
  checkCentralDirectory(view, { offset, end, count })
  return { offset, count }
}

function checkCentralDirectory(
  view: DataView,
  input: { offset: number; end: number; count: number }
) {
  let cursor = input.offset
  for (let index = 0; index < input.count; index++) {
    if (
      cursor + 46 > input.end ||
      view.getUint32(cursor, true) !== CENTRAL_SIGNATURE
    )
      invalidZip()
    if (view.getUint16(cursor + 34, true) !== 0) invalidZip()
    cursor +=
      46 +
      view.getUint16(cursor + 28, true) +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true)
    if (cursor > input.end) invalidZip()
  }
  if (cursor !== input.end) invalidZip()
}

export function checkZipEntry(entry: Entry, names: Set<string>) {
  const logical = entry.fileName.replace(/\.(jpg|png|webp)$/, "")
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(entry.fileName)) invalidZip()
  if (names.has(logical)) invalidZip()
  names.add(logical)
  checkEntryAttributes(entry)
  if (
    entry.uncompressedSize < 1 ||
    entry.uncompressedSize > ZIP_ENTRY_MAX_BYTES
  )
    invalidZip()
  if (entry.compressedSize < 1 || entry.compressedSize > ZIP_MAX_BYTES)
    invalidZip()
}

function checkEntryAttributes(entry: Entry) {
  if (entry.generalPurposeBitFlag & ~0x080e) invalidZip()
  if (entry.isEncrypted() || ![0, 8].includes(entry.compressionMethod))
    invalidZip()
  if (entry.versionNeededToExtract > 20) invalidZip()
  const mode = (entry.externalFileAttributes >>> 16) & UNIX_FILE_TYPE
  if (mode && mode !== UNIX_REGULAR_FILE) invalidZip()
  if (entry.externalFileAttributes & 0x10) invalidZip()
  if (entry.extraFields.some((field) => [0x0001, 0x7075].includes(field.id)))
    invalidZip()
}

export function invalidZip(): never {
  fail.validation({ archive: "validation.seed_archive" })
}
