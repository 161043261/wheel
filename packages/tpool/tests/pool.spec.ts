import tap from "tap";
import type Pool from "../src/pool.js";
import type { IFactory } from "../src/factory-validator.js";
import type { IOptions } from "../src/pool-default.js";
import { createPool } from "../src/index.js";

interface IResource {
  id: number;
}

export class ResourceFactory implements IFactory<IResource> {
  public created: number = 0;
  public destroyed: number = 0;
  public bin: IResource[] = [];

  create(): Promise<IResource> {
    return Promise.resolve({ id: this.created++ });
  }

  validate(): Promise<boolean> {
    return Promise.resolve(true);
  }

  destroy(resource: IResource): Promise<void> {
    this.destroyed++;
    this.bin.push(resource);
    return Promise.resolve();
  }
}

export async function stopPool(pool: Pool<any>): Promise<void> {
  return pool.drain().then(() => {
    return pool.clear();
  });
}

tap.test("test", (t) => {
  let borrowTimeLow = 0;
  let borrowTimeHigh = 0;
  let borrowCount = 0;
  const resourceFactory = new ResourceFactory();
  const config: IOptions = {
    max: 1,
    priorityRange: 2,
  };
  const pool = createPool(resourceFactory, config);
  function lowPriorityOnFulfilled(obj: IResource) {
    const time = Date.now();
    if (time > borrowTimeLow) {
      borrowTimeLow = time;
    }
    borrowCount++;
    pool.release(obj);
  }
  function highPriorityOnFulfilled(obj: IResource) {
    const time = Date.now();
    if (time > borrowTimeHigh) {
      borrowTimeHigh = time;
    }
    borrowCount++;
    pool.release(obj);
  }
  const operations: Promise<void>[] = [];
  for (let i = 0; i < 10; i++) {
    const op = pool.acquire(1).then(lowPriorityOnFulfilled);
    operations.push(op);
  }
  for (let i = 0; i < 10; i++) {
    const op = pool.acquire(0).then(highPriorityOnFulfilled);
    operations.push(op);
  }
  Promise.all(operations)
    .then(() => {
      t.equal(20, borrowCount);
      t.equal(true, borrowTimeLow >= borrowTimeHigh);
      stopPool(pool);
      t.end();
    })
    .catch(t.threw);
});

tap.test("test02", function (t) {
  let resources: string[] = [];
  const factory: IFactory<string> = {
    create: () => {
      return new Promise<string>((resolve) => {
        const tryCreate = () => {
          const resource = resources.shift();
          if (resource) {
            resolve(resource);
          } else {
            process.nextTick(tryCreate);
          }
        };
        tryCreate();
      });
    },
    destroy: () => Promise.resolve(),
  };
  const pool = createPool(factory, { max: 3, min: 3 });
  const acquirePromise = Promise.all([
    pool.acquire(),
    pool.acquire(),
    pool.acquire(),
  ]);
  acquirePromise.then((all) => {
    all.forEach((resource) => {
      // process.nextTick(pool.release.bind(pool), resource);
      process.nextTick(() => pool.release(resource));
    });
  });
  t.equal(pool.pending, 3);
  pool
    .drain()
    .then(() => pool.clear())
    .then((resolved) => {
      t.equal(resolved, undefined);
      t.end();
    });

  process.nextTick(() => {
    resources.push("a");
    resources.push("b");
    resources.push("c");
  });
});

tap.test("test03", function (t) {
  const pool = createPool(new ResourceFactory(), { max: 1 });
  pool
    .acquire()
    .then(function (obj) {
      t.equal(pool.available, 0);
      t.equal(pool.borrowed, 1);
      t.equal(pool.pending, 1);
      pool.release(obj);
    })
    .catch(t.threw);
  pool
    .acquire()
    .then(function (obj) {
      t.equal(pool.available, 0);
      t.equal(pool.borrowed, 1);
      t.equal(pool.pending, 0);
      pool.release(obj);
      stopPool(pool);
      t.end();
    })
    .catch(t.threw);
});
