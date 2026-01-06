package parallel

import (
	"bytes"

	"github.com/161043261/wheel/packages/cache-go/src/lru"
)

// A ByteView holds an immutable view of bytes.
type ByteView struct {
	bytes []byte
}

// Len implements [lru.Value].
func (b ByteView) Len() int {
	return len(b.bytes)
}

var _ lru.Value = (*ByteView)(nil)

func (b *ByteView) View() []byte {
	// cp := make([]byte, len(b.bytes))
	// copy(cp, b.bytes)
	// return cp
	return bytes.Clone(b.bytes)
}

func (b *ByteView) String() string {
	return string(b.bytes)
}
