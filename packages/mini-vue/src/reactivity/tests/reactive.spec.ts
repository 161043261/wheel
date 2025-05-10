import { reactive } from "../reactive";

describe("ReactiveTest", () => {
  it("testReactive1", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
  });
});
