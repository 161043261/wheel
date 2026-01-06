package http

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	consistent_hash "github.com/161043261/wheel/packages/cache-go/src/consistent-hash"
	"github.com/161043261/wheel/packages/cache-go/src/parallel"
	"github.com/161043261/wheel/packages/cache-go/src/peers"
)

const (
	DEFAULT_REPLICAS = 50
	DEFAULT_BASE_URL = "/cache-go/"
)

type HttpServer struct {
	host    string // e.g. http://127.0.0.1:8000
	baseUrl string // e.g. /cache-go/

	mu               sync.Mutex
	consistentHash   *consistent_hash.ConsistentHash
	host2httpGetters map[string]*httpClient
}

func (s *HttpServer) Construct(hosts ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.consistentHash = consistent_hash.NewConsistentHash(DEFAULT_REPLICAS, nil)

	// Use real node host, e.g. http://127.0.0.1:8000 as real node key
	s.consistentHash.AddRealNode(hosts...)

	s.host2httpGetters = make(map[string]*httpClient)
	for _, host := range hosts {
		s.host2httpGetters[host] = &httpClient{
			url: host + s.baseUrl,
		}
	}
}

// PickPeer implements [peers.PeerPicker].
func (s *HttpServer) PickPeer(key string) (peerGetter peers.PeerGetter, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if realNodeKey, ok := s.consistentHash.GetRealNode(key); ok && realNodeKey != s.host {
		return s.host2httpGetters[realNodeKey], true
	}
	return nil, false
}

var _ peers.PeerPicker = (*HttpServer)(nil)

func NewHttpServer(host string) *HttpServer {
	return &HttpServer{
		host:    host,
		baseUrl: DEFAULT_BASE_URL,
	}
}

func (s *HttpServer) Serve(w http.ResponseWriter, r *http.Request) {

	// Useless check
	if !strings.HasPrefix(r.URL.Path, s.baseUrl) {
		message := "http request url path does not start with base url"
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	// Useless check
	parts := strings.SplitN(r.URL.Path[len(s.baseUrl):], "/", 2)
	if len(parts) != 2 {
		message := "http request url path parts length < 2"
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	groupName := parts[0]
	key := parts[1]

	group := parallel.GetGroup(groupName)
	if group == nil {
		message := fmt.Sprintf("[cache-go] group %s not found", groupName)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	byteView, err := group.Get(key)
	if err != nil {
		message := fmt.Sprintf("[cache-go] get key %s from group %s error", key, groupName)
		http.Error(w, message, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Write(byteView.View())
}
