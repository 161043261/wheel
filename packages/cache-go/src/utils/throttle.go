package utils

import "sync"

type request struct {
	wg  *sync.WaitGroup
	res any
	err error
}

type Throttle struct {
	mu          sync.Mutex
	key2request map[string]*request
}

func (t *Throttle) Do(requestKey string, fn func() (res any, err error)) (any, error) {
	t.mu.Lock()
	if t.key2request == nil {
		t.key2request = make(map[string]*request)
	}

	if req, ok := t.key2request[requestKey]; ok {
		t.mu.Unlock()
		req.wg.Wait()
		return req.res, req.err
	}

	req := new(request)
	req.wg.Add(1)
	t.key2request[requestKey] = req
	t.mu.Unlock()

	req.res, req.err = fn()
	req.wg.Done()

	t.mu.Lock()
	delete(t.key2request, requestKey)
	t.mu.Unlock()

	return req.res, req.err
}
