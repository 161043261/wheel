package utils

import "sync"

type request struct {
	wg  sync.WaitGroup
	val any
	err error
}

type Throttle struct {
	mu          sync.Mutex
	key2request map[string]*request
}

func (t *Throttle) Do(key string, fn func() (any, error)) (any, error) {
	t.mu.Lock()
	if t.key2request == nil {
		t.key2request = make(map[string]*request)
	}

	if req, ok := t.key2request[key]; ok {
		t.mu.Unlock()
		req.wg.Wait()
		return req.val, req.err
	}

	req := new(request)
	req.wg.Add(1)
	t.key2request[key] = req
	t.mu.Unlock()

	req.val, req.err = fn()
	req.wg.Done()

	t.mu.Lock()
	delete(t.key2request, key)
	t.mu.Unlock()

	return req.val, req.err
}
