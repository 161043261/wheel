package consistent_hash

import (
	"sort"
	"strconv"

	"github.com/161043261/wheel/packages/cache-go/src/utils"
)

type HashFunc func(data []byte) uint32

type ConsistentHash struct {
	hashFunc          HashFunc
	replicas          int            // Virtual node multiplier
	vNode2realNode    map[int]string // Virtual node hash to real node key
	sortedVNodeHashes []int          // Sorted virtual node hashes on the hash **circle**
}

func NewConsistentHash(replicas int, fn HashFunc) *ConsistentHash {
	m := &ConsistentHash{
		hashFunc:       fn,
		replicas:       replicas,
		vNode2realNode: make(map[int]string),
	}
	if m.hashFunc == nil {
		// m.hash = crc32.ChecksumIEEE
		m.hashFunc = utils.CRC32
	}
	return m
}

func (c *ConsistentHash) AddRealNode(realNodeKeys ...string) {
	for _, key := range realNodeKeys {
		for i := 0; i < c.replicas; i++ {
			vNodeHash := int(c.hashFunc([]byte(key + strconv.Itoa(i))))
			c.sortedVNodeHashes = append(c.sortedVNodeHashes, vNodeHash)
			c.vNode2realNode[vNodeHash] = key
		}
		sort.Ints(c.sortedVNodeHashes)
	}
}

func (c *ConsistentHash) GetRealNode(key string) (realNodeKey string, ok bool) {
	if len(c.sortedVNodeHashes) == 0 {
		return "", false
	}
	hash := int(c.hashFunc([]byte(key)))

	// Binary search for appropriate virtual node
	idx := sort.Search(len(c.sortedVNodeHashes), func(i int) bool { return c.sortedVNodeHashes[i] >= hash })

	return c.vNode2realNode[c.sortedVNodeHashes[idx%len(c.sortedVNodeHashes)]], ok
}
