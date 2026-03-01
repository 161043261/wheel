import loadCppLib from "./load-cpp-lib.js";

interface IData {
  isMinHeap: string;
  arr: number[];
}

function isDataType(data: unknown): data is IData {
  return (
    typeof data === "object" &&
    data !== null &&
    "isMinHeap" in data &&
    typeof data.isMinHeap === "boolean" &&
    "arr" in data &&
    Array.isArray(data.arr) &&
    data.arr.length > 0 &&
    typeof data.arr[0] === "number"
  );
}

process.on("message", async (data: unknown) => {
  console.log(typeof data);
  if (!isDataType(data)) {
    throw new TypeError();
  }
  const cppLib = loadCppLib();
  const { arr, isMinHeap } = data;
  const buf = Buffer.alloc(arr.length * 8);
  for (let i = 0; i < arr.length; i++) {
    buf.writeDoubleLE(arr[i], i * 8);
  }
  const heap = cppLib.create(isMinHeap ? 1 : 0);
  // @ts-ignore
  cppLib.heapify(heap, buf, arr.length);

  console.log("heap size:", cppLib.heapsize(heap));
  console.log("heap peek:", cppLib.heappeek(heap));
  console.log("heap pop:", cppLib.heappop(heap));
  console.log("heap pop:", cppLib.heappop(heap));

  console.log("arr.length:", arr.length);
  console.log("buf.length:", buf.length);
  console.log("heap size:", cppLib.heapsize(heap));

  cppLib.heappush(heap, 0);
  console.log("heap peek:", cppLib.heappeek(heap));
  console.log(cppLib.heappeek(heap));
  sendToMainProcess("");
});

function sendToMainProcess(response: unknown, code: 0 | -1 = 0) {
  process.send?.({ code, response });
}
