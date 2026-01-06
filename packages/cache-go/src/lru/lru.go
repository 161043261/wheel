package lru

import "container/list"

type Lru struct {
	list *list.List

	maxBytes  int64 // total max bytes
	nBytes    int64 // total bytes
	cache     map[string]*list.Element
	OnEvicted func(key string, value Value)
}

type entry struct {
	key string
	val Value
}

type Value interface {
	Len() int
}

func New(maxBytes int64, onEvicted func(string, Value)) *Lru {
	return &Lru{
		maxBytes:  maxBytes,
		list:      list.New(),
		cache:     make(map[string]*list.Element),
		OnEvicted: onEvicted,
	}
}

func (l *Lru) Get(key string) (value Value, ok bool) {
	if el, ok := l.cache[key]; ok {
		l.list.MoveToFront(el)
		kv := el.Value.(*entry)
		return kv.val, true
	}
	return
}

func (l *Lru) Evict() {
	el := l.list.Back()
	if el != nil {
		l.list.Remove(el)
		kv := el.Value.(*entry)
		delete(l.cache, kv.key)
		l.nBytes -= int64(len(kv.key)) + int64(kv.val.Len())
		if l.OnEvicted != nil {
			l.OnEvicted(kv.key, kv.val)
		}
	}
}

func (l *Lru) Add(key string, val Value) {
	if el, ok := l.cache[key]; ok {
		l.list.MoveToFront(el)
		kv := el.Value.(*entry)
		l.nBytes += int64(val.Len()) - int64(kv.val.Len())
		kv.val = val
	} else {
		el := l.list.PushFront(&entry{key, val})
		l.cache[key] = el
		l.nBytes += int64(len(key)) + int64(val.Len())
	}
	for l.maxBytes != 0 && l.maxBytes < l.nBytes {
		l.Evict()
	}
}

func (l *Lru) Len() int {
	return l.list.Len()
}
