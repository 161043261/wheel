package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	cacheHttp "github.com/161043261/wheel/packages/cache-go/src/http"
	"github.com/161043261/wheel/packages/cache-go/src/parallel"
)

const (
	GROUP_NAME = "user"
	MAX_BYTES  = 2 << 10
	PROTOCOL   = "http://"
)

var database = map[string]string{
	"Alice": "1",
	"Bob":   "2",
	"Lark":  "3",
}

func createGroup() *parallel.Group {
	return parallel.NewGroup(GROUP_NAME, MAX_BYTES, func(key string) ([]byte, error) {
		log.Println("[database] search key", key)
		if val, ok := database[key]; ok {
			return []byte(val), nil
		}
		return nil, fmt.Errorf("key %v not found", key)
	})
}

func startCacheServer(serverAddr string, clientAddrs []string, group *parallel.Group) {
	httpServer := cacheHttp.NewHttpServer(serverAddr)
	httpServer.Construct(clientAddrs...)
	group.SetPeerPicker(httpServer)
	log.Println("cache server is running at", serverAddr)
	log.Fatal(
		http.ListenAndServe(serverAddr[len(PROTOCOL):], nil),
	)
}

func startApiServer(apiServerAddr string, group *parallel.Group) {
	http.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Query().Get("key")
		log.Println("[api] key", key)
		byteView, err := group.Get(key)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Write(byteView.View())
	})
	log.Println("api server is running at", apiServerAddr)
	log.Fatal(
		http.ListenAndServe(apiServerAddr[len(PROTOCOL):], nil),
	)
}

func main() {
	var (
		port int
		api  bool
	)
	flag.IntVar(&port, "port", 8001, "cache server port")
	flag.BoolVar(&api, "api", false, "start api server?")
	flag.Parse()

	apiAddr := PROTOCOL + "127.0.0.1:9000"
	clientPort2addr := map[int]string{
		8001: PROTOCOL + "127.0.0.1:8001",
		8002: PROTOCOL + "127.0.0.1:8002",
		8003: PROTOCOL + "127.0.0.1:8003",
	}

	var clientAddrs []string
	for _, clientAddr := range clientPort2addr {
		clientAddrs = append(clientAddrs, clientAddr)
	}
	group := createGroup()
	if api {
		go startApiServer(apiAddr, group)
	}
	startCacheServer(clientPort2addr[port], clientAddrs, group)
}
