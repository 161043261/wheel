package parallel

import (
	"bytes"
	"errors"
	"log"
	"sync"

	"github.com/161043261/wheel/packages/cache-go/src/lru"
	"github.com/161043261/wheel/packages/cache-go/src/peers"
	"github.com/161043261/wheel/packages/cache-go/src/utils"
)

type cache struct {
	cache    *lru.Lru
	mu       sync.Mutex
	maxBytes int64
}

func (c *cache) add(key string, val ByteView) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.cache == nil {
		c.cache = lru.New(c.maxBytes, nil)
	}
	c.cache.Add(key, val)
}

func (c *cache) get(key string) (val ByteView, ok bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.cache == nil {
		return
	}
	if v, ok := c.cache.Get(key); ok {
		return v.(ByteView), true
	}
	return
}

type LoadFunc func(key string) ([]byte, error)

type Group struct {
	name       string
	loader     LoadFunc
	cache      *cache
	peerPicker peers.PeerPicker
	throttle   *utils.Throttle
}

var (
	mu     sync.RWMutex
	groups = make(map[string]*Group)
)

func NewGroup(name string, maxBytes int64, loader LoadFunc) *Group {
	if loader == nil {
		panic("loader is empty")
	}
	mu.Lock()
	defer mu.Unlock()
	g := &Group{
		name:     name,
		loader:   loader,
		cache:    &cache{maxBytes: maxBytes},
		throttle: &utils.Throttle{},
	}
	groups[name] = g
	return g
}

func GetGroup(name string) *Group {
	mu.RLock()
	g := groups[name]
	mu.RUnlock()
	return g
}

func (g *Group) Get(key string) (ByteView, error) {
	if key == "" {
		return ByteView{}, errors.New("key is empty")
	}
	if v, ok := g.cache.get(key); ok {
		log.Println("[cache-go] cache hit")
		return v, nil
	}
	return g.loadThrottled(key)
}

// Deprecated: use [parallel.loadThrottled]
func (g *Group) load(key string) (ByteView, error) {
	if g.peerPicker != nil {
		if peerGetter, ok := g.peerPicker.PickPeer(key); ok {
			if val, err := g.loadFromPeer(peerGetter, key); err == nil {
				return val, nil
			}
			log.Println("[cache-go] load from peer failed")
		}
	}
	return g.loadLocally(key)
}

func (g *Group) loadThrottled(key string) (ByteView, error) {
	byteView, err := g.throttle.Do(key, func() (res any, err error) {
		if g.peerPicker != nil {
			if peerGetter, ok := g.peerPicker.PickPeer(key); ok {
				if val, err := g.loadFromPeer(peerGetter, key); err == nil {
					return val, nil
				}
				log.Println("[cache-go] load from peer failed")
			}
		}
		return g.loadLocally(key)
	})
	if err == nil {
		return byteView.(ByteView), nil
	}
	return ByteView{}, err
}

func (g *Group) loadLocally(key string) (ByteView, error) {
	bytes_, err := g.loader(key)
	if err != nil {
		return ByteView{}, err
	}
	val := ByteView{bytes: bytes.Clone(bytes_)}
	g.populateCache(key, val)
	return val, nil
}

func (g *Group) populateCache(key string, data any) {
	switch typedData := data.(type) {
	case []byte:
		val := ByteView{bytes: typedData}
		g.cache.add(key, val)
	case ByteView:
		g.cache.add(key, typedData)
	case *ByteView:
		g.cache.add(key, *typedData)
	}
}

func (g *Group) SetPeerPicker(peerPicker peers.PeerPicker) {
	if g.peerPicker != nil {
		return
	}
	g.peerPicker = peerPicker
}

func (g *Group) loadFromPeer(peerGetter peers.PeerGetter, key string) (ByteView, error) {
	bytes_, err := peerGetter.Get(g.name, key)
	if err != nil {
		return ByteView{}, err
	}
	val := ByteView{bytes: bytes_}
	return val, nil
}
