package utils

var crcTable [256]uint32

func init() {
	for i := range 256 {
		c := uint32(i)
		for range 8 {
			if c&1 != 0 {
				c = 0xedb88320 ^ (c >> 1)
			} else {
				c = c >> 1
			}
		}
		crcTable[i] = c
	}
}

func CRC32(data []byte) uint32 {
	crcValue := uint32(0xffffffff)
	for _, b := range data {
		crcValue = crcTable[(crcValue^uint32(b))&0xff] ^ (crcValue >> 8)
	}
	return crcValue ^ 0xffffffff
}
