const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
const ID_LENGTH = 8

/** A new id in the mock's `prefix-xxxxxxxx` shape (A5), from a secure random source. */
export function newId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH))
  // 256 is not a multiple of 36, so the first 4 letters come up a little more often; ids only
  // need to be unique, not uniform.
  const suffix = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join(
    ""
  )
  return `${prefix}-${suffix}`
}
