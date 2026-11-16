export type SeedImageIntent = {
  datasetId: string
  operationId: string
  assetId: string
  generation: number
  inputDigest: string
  normalizedDigest: string
  immutableKey: string
  bytes: Uint8Array<ArrayBuffer>
  mime: "image/jpeg" | "image/png" | "image/webp"
  width: number
  height: number
}

export type SeedStoredImage = {
  immutableKey: string
  uploadId: string
  inputWidth: number
  inputHeight: number
  providerWidth: number
  providerHeight: number
  digest: string
}
