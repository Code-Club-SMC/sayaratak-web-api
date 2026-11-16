import { Buffer } from "node:buffer"
import { deflateRawSync } from "node:zlib"

export type ZipFixtureEntry = {
  filename: string
  bytes: Uint8Array
  method?: number
  flags?: number
  attributes?: number
  expandedSize?: number
  crc32?: number
}

/** Real ZIP headers and compressed payloads, with optional hostile metadata. */
export function seedZipFixture(entries: ZipFixtureEntry[]) {
  const local: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const result = zipFixtureEntry(entry, offset)
    local.push(result.local)
    central.push(result.central)
    offset += result.local.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...local, directory, end]))
}

function zipFixtureEntry(entry: ZipFixtureEntry, offset: number) {
  const filename = Buffer.from(entry.filename)
  const method = entry.method ?? 8
  const compressed =
    method === 0 ? Buffer.from(entry.bytes) : deflateRawSync(entry.bytes)
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(entry.flags ?? 0, 6)
  header.writeUInt16LE(method, 8)
  header.writeUInt32LE(entry.crc32 ?? Bun.hash.crc32(entry.bytes), 14)
  header.writeUInt32LE(compressed.length, 18)
  header.writeUInt32LE(entry.expandedSize ?? entry.bytes.length, 22)
  header.writeUInt16LE(filename.length, 26)
  const directory = Buffer.alloc(46)
  directory.writeUInt32LE(0x02014b50)
  directory.writeUInt16LE(0x0314, 4)
  header.copy(directory, 6, 4, 28)
  directory.writeUInt32LE(entry.attributes ?? 0, 38)
  directory.writeUInt32LE(offset, 42)
  return {
    local: Buffer.concat([header, filename, compressed]),
    central: Buffer.concat([directory, filename]),
  }
}
