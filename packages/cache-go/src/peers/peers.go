package peers

type PeerPicker interface {
	PickPeer(key string) (peerGetter PeerGetter, ok bool)
}

type PeerGetter interface {
	Get(group string, key string) ([]byte, error)
}
