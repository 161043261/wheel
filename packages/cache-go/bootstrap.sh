trap "rm -rf ./build; kill 0" EXIT

mkdir -p ./build
mkdir -p ./logs

go build -o ./build/main ./src/main.go

./build/main -port=8001 &> ./logs/8001.log &
./build/main -port=8002 &> ./logs/8002.log &
./build/main -port=8003 -api=1 &> ./logs/8003.log &

sleep 2

echo "start tests"

curl "http://127.0.0.1:9000/api?key=Alice" &
curl "http://127.0.0.1:9000/api?key=Bob" &
curl "http://127.0.0.1:9000/api?key=Lark" &

wait
