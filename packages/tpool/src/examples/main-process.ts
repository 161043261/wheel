import ChildProcessPool from "./process-pool.js";

const childProcessPool = new ChildProcessPool("./child-process.js");
childProcessPool.callWorkerProcess({
  isMinHeap: true,
  arr: [1, 6, 4, 3, 2],
});

process.on("beforeExit", () => {
  childProcessPool.destroy();
});
