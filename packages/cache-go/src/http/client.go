package http

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/161043261/wheel/packages/cache-go/src/peers"
)

type httpClient struct {
	url string // e.g. http://127.0.0.1:8080/cache-go/
}

// Get implements [peers.PeerGetter].
func (c *httpClient) Get(group string, key string) ([]byte, error) {
	// e.g. http://127.0.0.1:8000/cache-go/key
	url := fmt.Sprintf(
		"%v%v/%v",
		c.url,
		url.QueryEscape(group), // URL encode group
		url.QueryEscape(key),   // URL encode key
	)
	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		message := fmt.Sprintf("status code %v", res.Status)
		return nil, errors.New(message)
	}

	bytes, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	return bytes, nil
}

var _ peers.PeerGetter = (*httpClient)(nil)
