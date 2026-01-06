const crcTable = new Uint32Array(256)

for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c
}

function crc32(str: string | Uint8Array): string {
  const bytes = typeof str === 'string' ? new TextEncoder().encode(str) : str
  let crcValue = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0
    crcValue = (crcTable[(crcValue ^ byte) & 0xff] ?? 0) ^ (crcValue >>> 8)
  }
  return ((crcValue ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

export default crc32
